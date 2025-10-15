import { useState, useEffect } from 'react';
import { 
  listFiles, 
  initUpload, 
  completeUpload, 
  getDownloadUrl,
  updateFile,
  deleteFile
} from '../services/api';
import {
  importCriptographyCode,
  encryptWithAES,
  decryptWithAES,
  generateIV,
} from '../utils/crypto';
import { getCriptographyCode } from '../utils/storage';

interface FileMetadata {
  fileId: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export default function FileManager() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await listFiles();
      setFiles(response.data.files);
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessage('');
    setLoading(true);
    setUploadProgress(0);

    try {
      // 1. Obter criptografyCode do usuário
      const criptografiaCode = getCriptographyCode();
      if (!criptografiaCode) {
        throw new Error('CriptographyCode não encontrada. Faça login novamente.');
      }

      // 2. Iniciar upload
      setMessage(`📤 Iniciando upload de ${file.name}...`);
      const initResponse = await initUpload({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      });
      setUploadProgress(10);

      // 3. Importar criptografyCode como chave AES
      setMessage('🔑 Preparando criptografia...');
      const cryptoKey = await importCriptographyCode(criptografiaCode);
      setUploadProgress(20);

      // 4. Ler e criptografar arquivo
      setMessage('🔒 Criptografando arquivo...');
      const fileBuffer = await file.arrayBuffer();
      const iv = generateIV();
      const { ciphertext } = await encryptWithAES(fileBuffer, cryptoKey, iv);
      setUploadProgress(50);

      // 5. Combinar IV + dados criptografados
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);

      // 6. Upload para Supabase Storage
      setMessage('☁️ Enviando arquivo criptografado...');
      const uploadResponse = await fetch(initResponse.data.presignedUrl, {
        method: 'PUT',
        body: combined,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Falha no upload para armazenamento');
      }
      setUploadProgress(80);

      // 7. Completar upload
      setMessage('✔️ Finalizando upload...');
      await completeUpload({
        uploadId: initResponse.data.uploadId,
        fileId: initResponse.data.fileId,
        fileName: file.name,
        fileSize: file.size,
      });
      setUploadProgress(100);

      setMessage(`✅ Arquivo "${file.name}" enviado e criptografado com sucesso!`);
      await loadFiles();

      // Reset input
      e.target.value = '';
    } catch (error) {
      setMessage(`❌ Erro no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    setMessage('');
    setLoading(true);

    try {
      console.log('[Download] Iniciando download para', fileId, fileName);

      // 1. Obter criptografyCode do usuário
      const criptografiaCode = getCriptographyCode();
      if (!criptografiaCode) {
        console.error('[Download] CriptographyCode não encontrada');
        throw new Error('CriptographyCode não encontrada. Faça login novamente.');
      }

      // 2. Solicitar URL de download
      setMessage(`📥 Solicitando download de ${fileName}...`);
      const downloadResponse = await getDownloadUrl(fileId);
      console.log('[Download] Resposta da API:', downloadResponse);

      // 3. Importar criptografyCode como chave AES
      setMessage('🔑 Preparando descriptografia...');
      const cryptoKey = await importCriptographyCode(criptografiaCode);

      // 4. Download do arquivo criptografado
      setMessage('☁️ Baixando arquivo criptografado...');
      const fileResponse = await fetch(downloadResponse.data.presignedUrl);
      if (!fileResponse.ok) {
        const text = await fileResponse.text();
        console.error('[Download] Erro HTTP ao baixar arquivo:', fileResponse.status, text);
        throw new Error(`Falha ao baixar arquivo: HTTP ${fileResponse.status} - ${text}`);
      }
      const encryptedFileBuffer = await fileResponse.arrayBuffer();
      console.log('[Download] Arquivo criptografado baixado, tamanho:', encryptedFileBuffer.byteLength);

      // 5. Separar IV e dados criptografados
      setMessage('🔓 Descriptografando arquivo...');
      const combined = new Uint8Array(encryptedFileBuffer);
      const iv = combined.slice(0, 12); // IV é sempre 12 bytes para AES-GCM
      const encryptedData = combined.slice(12);

      // 6. Descriptografar arquivo
      const decryptedBuffer = await decryptWithAES(encryptedData.buffer, cryptoKey, iv);
      console.log('[Download] Arquivo descriptografado, tamanho:', decryptedBuffer.byteLength);

      // 7. Fazer download
      setMessage('💾 Salvando arquivo...');
      const blob = new Blob([decryptedBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      console.log('[Download] Download concluído:', fileName);

      setMessage(`✅ Arquivo "${fileName}" baixado e descriptografado com sucesso!`);
    } catch (error) {
      console.error('[Download] Erro geral:', error);
      let errorMessage = 'Erro desconhecido';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setMessage(`❌ Erro no download: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (fileId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`Tem certeza que deseja atualizar este arquivo?\n\nO conteúdo anterior será substituído.`)) {
      e.target.value = '';
      return;
    }

    setMessage('');
    setLoading(true);
    setUploadProgress(0);

    try {
      // 1. Obter criptografyCode do usuário
      const criptografiaCode = getCriptographyCode();
      if (!criptografiaCode) {
        throw new Error('CriptographyCode não encontrada. Faça login novamente.');
      }

      // 2. Iniciar atualização (recebe nova presigned URL)
      setMessage(`🔄 Iniciando atualização de ${file.name}...`);
      const updateResponse = await updateFile(fileId, {
        fileName: file.name,
        fileSize: file.size,
      });
      setUploadProgress(10);

      // 3. Importar criptografyCode como chave AES
      setMessage('🔑 Preparando criptografia...');
      const cryptoKey = await importCriptographyCode(criptografiaCode);
      setUploadProgress(20);

      // 4. Ler e criptografar arquivo
      setMessage('🔒 Criptografando arquivo...');
      const fileBuffer = await file.arrayBuffer();
      const iv = generateIV();
      const { ciphertext } = await encryptWithAES(fileBuffer, cryptoKey, iv);
      setUploadProgress(50);

      // 5. Combinar IV + dados criptografados
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);

      // 6. Upload para Supabase Storage
      setMessage('☁️ Enviando arquivo atualizado...');
      const uploadResponse = await fetch(updateResponse.data.presignedUrl, {
        method: 'PUT',
        body: combined,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Falha no upload para armazenamento');
      }
      setUploadProgress(80);

      // 7. Completar upload (mesma lógica do upload normal)
      setMessage('✔️ Finalizando atualização...');
      await completeUpload({
        uploadId: updateResponse.data.uploadId,
        fileId: updateResponse.data.fileId,
        fileName: file.name,
        fileSize: file.size,
      });
      setUploadProgress(100);

      setMessage(`✅ Arquivo atualizado com sucesso!`);
      await loadFiles();

      // Reset input
      e.target.value = '';
    } catch (error) {
      setMessage(`❌ Erro na atualização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o arquivo "${fileName}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setMessage('');
    setLoading(true);

    try {
      setMessage(`🗑️ Excluindo ${fileName}...`);
      await deleteFile(fileId);
      
      setMessage(`✅ Arquivo "${fileName}" excluído com sucesso!`);
      await loadFiles();
    } catch (error) {
      setMessage(`❌ Erro ao excluir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📁 Gerenciador de Arquivos</h2>

      {/* Upload Section */}
      <div style={styles.uploadSection}>
        <h3 style={styles.sectionTitle}>📤 Upload de Arquivo</h3>
        <input
          type="file"
          onChange={handleUpload}
          disabled={loading}
          style={styles.fileInput}
          id="file-upload"
        />
        <label htmlFor="file-upload" style={{
          ...styles.uploadButton,
          ...(loading ? styles.uploadButtonDisabled : {})
        }}>
          {loading ? '⏳ Enviando...' : '📁 Selecionar Arquivo'}
        </label>

        {uploadProgress > 0 && (
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${uploadProgress}%`}} />
            <span style={styles.progressText}>{uploadProgress}%</span>
          </div>
        )}
      </div>

      {message && (
        <div style={{
          ...styles.message,
          ...(message.includes('✅') ? styles.messageSuccess : 
              message.includes('❌') ? styles.messageError : 
              styles.messageInfo)
        }}>
          {message}
        </div>
      )}

      {/* Files List */}
      <div style={styles.filesSection}>
        <h3 style={styles.sectionTitle}>
          📋 Meus Arquivos ({files.length})
        </h3>

        {files.length === 0 ? (
          <p style={styles.emptyMessage}>Nenhum arquivo enviado ainda.</p>
        ) : (
          <div style={styles.filesList}>
            {files.map((file) => (
              <div key={file.fileId} style={styles.fileCard}>
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>📄 {file.fileName}</div>
                  <div style={styles.fileDetails}>
                    <span>{formatBytes(file.sizeBytes)}</span>
                    <span style={styles.separator}>•</span>
                    <span>{formatDate(file.createdAt)}</span>
                  </div>
                </div>
                <div style={styles.fileActions}>
                  <button
                    onClick={() => handleDownload(file.fileId, file.fileName)}
                    disabled={loading}
                    style={{
                      ...styles.downloadButton,
                      ...(loading ? styles.downloadButtonDisabled : {})
                    }}
                  >
                    ⬇️ Download
                  </button>
                  <label
                    htmlFor={`update-${file.fileId}`}
                    style={{
                      ...styles.updateButton,
                      ...(loading ? styles.downloadButtonDisabled : {})
                    }}
                  >
                    🔄 Atualizar
                  </label>
                  <input
                    type="file"
                    id={`update-${file.fileId}`}
                    onChange={(e) => handleUpdate(file.fileId, e)}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => handleDelete(file.fileId, file.fileName)}
                    disabled={loading}
                    style={{
                      ...styles.deleteButton,
                      ...(loading ? styles.downloadButtonDisabled : {})
                    }}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#333',
  },
  uploadSection: {
    background: '#f8f9fa',
    border: '2px dashed #dee2e6',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#495057',
  },
  fileInput: {
    display: 'none',
  },
  uploadButton: {
    display: 'inline-block',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'opacity 0.3s',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  progressBar: {
    position: 'relative',
    width: '100%',
    height: '24px',
    background: '#e9ecef',
    borderRadius: '12px',
    overflow: 'hidden',
    marginTop: '16px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s ease',
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    fontWeight: '600',
    color: '#333',
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    textAlign: 'center',
  },
  messageSuccess: {
    background: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
  },
  messageError: {
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
  },
  messageInfo: {
    background: '#d1ecf1',
    color: '#0c5460',
    border: '1px solid #bee5eb',
  },
  filesSection: {
    background: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '12px',
    padding: '24px',
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fileCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    transition: 'box-shadow 0.3s',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  },
  fileDetails: {
    fontSize: '13px',
    color: '#6c757d',
  },
  separator: {
    margin: '0 8px',
  },
  fileActions: {
    display: 'flex',
    gap: '8px',
  },
  downloadButton: {
    padding: '8px 16px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.3s, opacity 0.3s',
  },
  updateButton: {
    padding: '8px 16px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.3s, opacity 0.3s',
    display: 'inline-block',
    textAlign: 'center',
  },
  deleteButton: {
    padding: '8px 16px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.3s, opacity 0.3s',
  },
  downloadButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '14px',
    padding: '24px',
  },
};
