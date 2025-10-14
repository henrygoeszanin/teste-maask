import { useState, useEffect } from 'react';
import { 
  listFiles, 
  initUpload, 
  completeUpload, 
  getDownloadUrl 
} from '../services/api';
import {
  generateFEK,
  generateIV,
  encryptWithAES,
  decryptWithAES,
  exportSymmetricKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  importSymmetricKey,
} from '../utils/crypto';
import { getMDKFromMemory } from '../utils/storage';

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
      const mdk = getMDKFromMemory();
      if (!mdk) {
        throw new Error('MDK não encontrada na memória. Faça o setup do dispositivo.');
      }

      // Passo 1: Iniciar upload
      setMessage(`📤 Iniciando upload de ${file.name}...`);
      const initResponse = await initUpload({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      });
      setUploadProgress(10);

      // Passo 2: Gerar FEK e IV
      setMessage('🔑 Gerando chave de criptografia do arquivo...');
      const fek = await generateFEK();
      const iv = generateIV();
      setUploadProgress(20);

      // Passo 3: Ler e criptografar arquivo
      setMessage('🔒 Criptografando arquivo...');
      const fileBuffer = await file.arrayBuffer();
      const { ciphertext, authTag } = await encryptWithAES(fileBuffer, fek, iv);
      setUploadProgress(50);

      // Passo 4: Upload para S3
      setMessage('☁️ Enviando arquivo criptografado para armazenamento...');
      const uploadResponse = await fetch(initResponse.data.presignedUrl, {
        method: 'PUT',
        body: ciphertext,
        // Removendo headers para evitar preflight CORS
      });

      if (!uploadResponse.ok) {
        throw new Error('Falha no upload para S3');
      }
      setUploadProgress(80);

      // Passo 5: Criptografar FEK com MDK
      setMessage('🔐 Protegendo chave do arquivo com MDK...');
      const fekBase64 = await exportSymmetricKey(fek);
      const fekBuffer = base64ToArrayBuffer(fekBase64);
      const fekIv = generateIV();
      const { ciphertext: encryptedFek } = await encryptWithAES(
        fekBuffer,
        mdk,
        fekIv
      );
      setUploadProgress(90);

      // Passo 6: Completar upload
      setMessage('✔️ Finalizando upload...');
      await completeUpload({
        uploadId: initResponse.data.uploadId,
        encryptedFek: arrayBufferToBase64(encryptedFek),
        encryptionMetadata: {
          algorithm: 'AES-256-GCM',
          iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
          authTag: arrayBufferToBase64(authTag.buffer as ArrayBuffer),
        },
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
      const mdk = getMDKFromMemory();
      if (!mdk) {
        throw new Error('MDK não encontrada na memória. Faça o setup do dispositivo.');
      }

      // Passo 1: Obter URL e metadados
      setMessage(`📥 Solicitando download de ${fileName}...`);
      const downloadResponse = await getDownloadUrl(fileId);

      // Passo 2: Descriptografar FEK com MDK
      setMessage('🔓 Descriptografando chave do arquivo...');
      const encryptedFekBuffer = base64ToArrayBuffer(downloadResponse.data.encryptedFek);
      const fekIv = new Uint8Array(base64ToArrayBuffer(downloadResponse.data.encryptionMetadata.iv));
      const fekAuthTag = new Uint8Array(base64ToArrayBuffer(downloadResponse.data.encryptionMetadata.authTag));

      const fekBuffer = await decryptWithAES(encryptedFekBuffer, mdk, fekIv, fekAuthTag);
      const fekBase64 = arrayBufferToBase64(fekBuffer);
      const fek = await importSymmetricKey(fekBase64);

      // Passo 3: Download do arquivo criptografado
      setMessage('☁️ Baixando arquivo criptografado...');
      const fileResponse = await fetch(downloadResponse.data.presignedUrl);
      const encryptedFileBuffer = await fileResponse.arrayBuffer();

      // Passo 4: Descriptografar arquivo
      setMessage('🔓 Descriptografando arquivo...');
      const fileIv = new Uint8Array(base64ToArrayBuffer(downloadResponse.data.encryptionMetadata.iv));
      const fileAuthTag = new Uint8Array(base64ToArrayBuffer(downloadResponse.data.encryptionMetadata.authTag));

      const decryptedBuffer = await decryptWithAES(
        encryptedFileBuffer,
        fek,
        fileIv,
        fileAuthTag
      );

      // Passo 5: Fazer download
      setMessage('💾 Salvando arquivo...');
      const blob = new Blob([decryptedBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setMessage(`✅ Arquivo "${fileName}" baixado e descriptografado com sucesso!`);
    } catch (error) {
      setMessage(`❌ Erro no download: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
  downloadButton: {
    padding: '8px 16px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'opacity 0.3s',
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
