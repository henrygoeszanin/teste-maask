import { useState } from 'react';
import {
  calculateKeyFingerprint,
  decryptWithPrivateKey,
  encryptWithPublicKey,
  exportPublicKeyToPEM,
  exportSymmetricKey,
  generateDeviceKeyPair,
  generateMDK,
  generateUUID,
  importSymmetricKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from '../utils/crypto';
import { saveDeviceId, savePrivateKey, saveMDKInMemory, getPrivateKey } from '../utils/storage';
import { registerDevice, createEnvelope, getMyEnvelope } from '../services/api';

interface DeviceSetupProps {
  onSetupComplete: () => void;
}

export default function DeviceSetup({ onSetupComplete }: DeviceSetupProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSetup = async () => {
    setMessage('');
    setLoading(true);
    setStep(1);

    try {
      // Passo 1: Gerar par de chaves do dispositivo
      setMessage('🔑 Gerando par de chaves RSA-4096...');
      const keyPair = await generateDeviceKeyPair();
      const deviceId = generateUUID();
      setStep(2);

      // Passo 2: Exportar chave pública
      setMessage('📤 Exportando chave pública...');
      const publicKeyPem = await exportPublicKeyToPEM(keyPair.publicKey);
      const keyFingerprint = await calculateKeyFingerprint(keyPair.publicKey);
      setStep(3);

      // Passo 3: Salvar chave privada localmente
      setMessage('💾 Salvando chave privada localmente...');
      await savePrivateKey(keyPair.privateKey);
      saveDeviceId(deviceId);
      setStep(4);

      // Passo 4: Registrar dispositivo no servidor
      setMessage('📡 Registrando dispositivo no servidor...');
      await registerDevice({
        deviceId,
        publicKey: publicKeyPem,
        publicKeyFormat: 'PEM',
        keyFingerprint,
      });
      setStep(5);

      // Passo 5: Verificar se envelope já existe
      setMessage('🔍 Verificando envelope existente...');
      let mdk: CryptoKey;
      
      try {
        const envelopeResponse = await getMyEnvelope();
        setMessage('📦 Envelope encontrado! Descriptografando MDK...');
        
        // Descriptografar MDK com chave privada
        const encryptedMdkBuffer = base64ToArrayBuffer(envelopeResponse.data.envelopeCiphertext);
        const mdkBuffer = await decryptWithPrivateKey(encryptedMdkBuffer, keyPair.privateKey);
        const mdkBase64 = arrayBufferToBase64(mdkBuffer);
        mdk = await importSymmetricKey(mdkBase64);
        
        setMessage('✅ MDK recuperada do envelope existente!');
        setStep(6);
      } catch {
        // Envelope não existe - criar novo
        setMessage('🔐 Gerando nova MDK (primeira vez)...');
        mdk = await generateMDK();
        setStep(6);

        // Passo 6: Criptografar MDK com chave pública
        setMessage('🔒 Criptografando MDK...');
        const mdkBase64 = await exportSymmetricKey(mdk);
        const mdkBuffer = base64ToArrayBuffer(mdkBase64);
        const encryptedMdk = await encryptWithPublicKey(mdkBuffer, keyPair.publicKey);
        const envelopeCiphertext = arrayBufferToBase64(encryptedMdk);
        setStep(7);

        // Passo 7: Criar envelope no servidor
        setMessage('📮 Criando envelope no servidor...');
        await createEnvelope({
          deviceId,
          envelopeCiphertext,
          encryptionMetadata: {
            algorithm: 'RSA-OAEP',
            hashFunction: 'SHA-256',
          },
        });
        setStep(8);
      }

      // Salvar MDK na memória
      saveMDKInMemory(mdk);

      setMessage('✅ Setup completo! Dispositivo configurado com sucesso.');
      setTimeout(() => onSetupComplete(), 1000);

    } catch (error) {
      setMessage(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverMDK = async () => {
    setMessage('');
    setLoading(true);

    try {
      setMessage('🔍 Buscando envelope...');
      const privateKey = await getPrivateKey();
      
      if (!privateKey) {
        throw new Error('Chave privada não encontrada. Execute o setup completo.');
      }

      const envelopeResponse = await getMyEnvelope();
      
      setMessage('🔓 Descriptografando MDK...');
      const encryptedMdkBuffer = base64ToArrayBuffer(envelopeResponse.data.envelopeCiphertext);
      const mdkBuffer = await decryptWithPrivateKey(encryptedMdkBuffer, privateKey);
      const mdkBase64 = arrayBufferToBase64(mdkBuffer);
      const mdk = await importSymmetricKey(mdkBase64);
      
      saveMDKInMemory(mdk);
      
      setMessage('✅ MDK recuperada com sucesso!');
      setTimeout(() => onSetupComplete(), 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Tratamento específico para MDK não encontrada
      if (errorMessage.includes('MDK not found') || errorMessage.includes('404')) {
        setMessage(`❌ MDK não encontrada neste dispositivo. Por favor, faça o setup completo clicando em "Configurar Dispositivo" ou sincronize a MDK de outro dispositivo autorizado.`);
      } else {
        setMessage(`❌ Erro: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔧 Setup do Dispositivo</h2>
        <p style={styles.subtitle}>
          Configure este dispositivo para criptografia E2EE
        </p>

        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>ℹ️ O que será feito:</h3>
          <ol style={styles.list}>
            <li>Gerar par de chaves RSA-4096 (pública/privada)</li>
            <li>Registrar dispositivo no servidor (apenas chave pública)</li>
            <li>Gerar ou recuperar MDK (Master Decryption Key)</li>
            <li>Criptografar MDK com sua chave pública</li>
            <li>Salvar chave privada apenas neste dispositivo</li>
          </ol>
        </div>

        {loading && (
          <div style={styles.progress}>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${(step / 8) * 100}%`}} />
            </div>
            <p style={styles.progressText}>Passo {step} de 8</p>
          </div>
        )}

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

        <div style={styles.buttonGroup}>
          <button
            onClick={handleSetup}
            disabled={loading}
            style={{...styles.button, ...(loading ? styles.buttonDisabled : {})}}
          >
            {loading ? '⏳ Configurando...' : '🚀 Iniciar Setup Completo'}
          </button>

          <button
            onClick={handleRecoverMDK}
            disabled={loading}
            style={{...styles.buttonSecondary, ...(loading ? styles.buttonDisabled : {})}}
          >
            {loading ? '⏳ Recuperando...' : '🔄 Apenas Recuperar MDK'}
          </button>
        </div>

        <div style={styles.warning}>
          <p style={styles.warningText}>
            ⚠️ <strong>Importante:</strong> A chave privada será armazenada apenas neste dispositivo.
            Não a compartilhe e não a perca!
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: '600px',
    width: '100%',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '8px',
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '24px',
  },
  infoBox: {
    background: '#f0f7ff',
    border: '2px solid #90cdf4',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#2c5282',
  },
  list: {
    margin: '0',
    paddingLeft: '20px',
    color: '#2d3748',
    lineHeight: '1.8',
  },
  progress: {
    marginBottom: '16px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
    transition: 'width 0.3s ease',
  },
  progressText: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
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
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.3s',
  },
  buttonSecondary: {
    padding: '14px',
    background: 'white',
    color: '#f5576c',
    border: '2px solid #f5576c',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.3s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  warning: {
    marginTop: '24px',
    padding: '16px',
    background: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
  },
  warningText: {
    margin: 0,
    fontSize: '13px',
    color: '#856404',
    lineHeight: '1.6',
  },
};
