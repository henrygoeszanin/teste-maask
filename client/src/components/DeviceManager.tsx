import { useState, useEffect } from 'react';
import {
  listDevices,
  revokeDevice,
  getDevice,
  createEnvelope,
  type Device,
} from '../services/api';
import {
  exportSymmetricKey,
  importPublicKeyFromPEM,
  encryptWithPublicKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from '../utils/crypto';
import { getMDKFromMemory, getDeviceId } from '../utils/storage';

export default function DeviceManager() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await listDevices();
      setDevices(response.data.devices);
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
    }
  };

  const handleAuthorize = async (device: Device) => {
    setMessage('');
    setLoading(true);
    setSelectedDevice(device);

    try {
      const mdk = getMDKFromMemory();
      if (!mdk) {
        throw new Error('MDK não encontrada na memória.');
      }

      // Passo 1: Buscar informações do dispositivo
      setMessage(`🔍 Buscando informações do dispositivo ${device.deviceId.substring(0, 8)}...`);
      const deviceInfo = await getDevice(device.id);

      // Passo 2: Importar chave pública do dispositivo
      setMessage('🔑 Importando chave pública do dispositivo...');
      const publicKey = await importPublicKeyFromPEM(deviceInfo.data.publicKey);

      // Passo 3: Exportar MDK
      setMessage('📤 Exportando MDK...');
      const mdkBase64 = await exportSymmetricKey(mdk);
      const mdkBuffer = base64ToArrayBuffer(mdkBase64);

      // Passo 4: Criptografar MDK com chave pública do dispositivo
      setMessage('🔒 Criptografando MDK para o dispositivo...');
      const encryptedMdk = await encryptWithPublicKey(mdkBuffer, publicKey);
      const envelopeCiphertext = arrayBufferToBase64(encryptedMdk);

      // Passo 5: Criar envelope
      setMessage('📮 Criando envelope no servidor...');
      await createEnvelope({
        deviceId: device.deviceId,
        envelopeCiphertext,
        encryptionMetadata: {
          algorithm: 'RSA-OAEP',
          hashFunction: 'SHA-256',
        },
      });

      setMessage(`✅ Dispositivo ${device.deviceId.substring(0, 8)} autorizado com sucesso!`);
      await loadDevices();
    } catch (error) {
      setMessage(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      setSelectedDevice(null);
    }
  };

  const handleRevoke = async (device: Device) => {
    if (!confirm(`Tem certeza que deseja revogar o dispositivo ${device.deviceId.substring(0, 8)}?`)) {
      return;
    }

    setMessage('');
    setLoading(true);
    setSelectedDevice(device);

    try {
      setMessage(`🚫 Revogando dispositivo ${device.deviceId.substring(0, 8)}...`);
      await revokeDevice(device.id, 'Revogado manualmente pelo usuário');

      setMessage(`✅ Dispositivo ${device.deviceId.substring(0, 8)} revogado com sucesso!`);
      await loadDevices();
    } catch (error) {
      setMessage(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      setSelectedDevice(null);
    }
  };

  const currentDeviceId = getDeviceId();

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { text: '✅ Ativo', color: '#28a745' },
      inactive: { text: '⚠️ Inativo', color: '#ffc107' },
      revoked: { text: '🚫 Revogado', color: '#dc3545' },
      pending: { text: '⏳ Pendente', color: '#17a2b8' },
    };
    return badges[status as keyof typeof badges] || badges.active;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🖥️ Gerenciamento de Dispositivos</h2>

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

      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>ℹ️ Sobre Dispositivos</h3>
        <p style={styles.infoText}>
          Cada dispositivo possui seu próprio par de chaves RSA. Para autorizar um novo dispositivo,
          ele precisa ter o <strong>envelope</strong> (MDK criptografada com sua chave pública).
        </p>
        <p style={styles.infoText}>
          Status <strong>Pendente</strong>: Dispositivo registrado mas sem envelope (não pode acessar arquivos).
        </p>
        <p style={styles.infoText}>
          Para autorizar, clique em <strong>"Autorizar Dispositivo"</strong>.
        </p>
      </div>

      <div style={styles.devicesSection}>
        <h3 style={styles.sectionTitle}>
          📱 Dispositivos ({devices.length})
        </h3>

        {devices.length === 0 ? (
          <p style={styles.emptyMessage}>Nenhum dispositivo registrado.</p>
        ) : (
          <div style={styles.devicesList}>
            {devices.map((device) => {
              const isCurrentDevice = device.deviceId === currentDeviceId;
              const badge = getStatusBadge(device.status);
              const isPending = device.status === 'inactive';

              return (
                <div
                  key={device.id}
                  style={{
                    ...styles.deviceCard,
                    ...(isCurrentDevice ? styles.deviceCardCurrent : {}),
                  }}
                >
                  <div style={styles.deviceInfo}>
                    <div style={styles.deviceHeader}>
                      <span style={styles.deviceName}>
                        {isCurrentDevice && '⭐ '}
                        {device.deviceId.substring(0, 12)}...
                      </span>
                      <span style={{...styles.statusBadge, background: badge.color}}>
                        {badge.text}
                      </span>
                    </div>
                    <div style={styles.deviceDetails}>
                      <div>🔑 Fingerprint: {device.keyFingerprint.substring(0, 16)}...</div>
                      <div>📅 Criado: {new Date(device.createdAt).toLocaleString('pt-BR')}</div>
                      {device.isMasterDevice === 1 && (
                        <div style={styles.masterBadge}>👑 Dispositivo Mestre</div>
                      )}
                    </div>
                  </div>

                  {!isCurrentDevice && (
                    <div style={styles.deviceActions}>
                      {isPending && (
                        <button
                          onClick={() => handleAuthorize(device)}
                          disabled={loading && selectedDevice?.id === device.id}
                          style={{
                            ...styles.authorizeButton,
                            ...(loading && selectedDevice?.id === device.id ? styles.buttonDisabled : {})
                          }}
                        >
                          {loading && selectedDevice?.id === device.id 
                            ? '⏳ Autorizando...' 
                            : '✅ Autorizar'}
                        </button>
                      )}

                      {device.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(device)}
                          disabled={loading && selectedDevice?.id === device.id}
                          style={{
                            ...styles.revokeButton,
                            ...(loading && selectedDevice?.id === device.id ? styles.buttonDisabled : {})
                          }}
                        >
                          {loading && selectedDevice?.id === device.id 
                            ? '⏳ Revogando...' 
                            : '🚫 Revogar'}
                        </button>
                      )}
                    </div>
                  )}

                  {isCurrentDevice && (
                    <div style={styles.currentDeviceLabel}>
                      Este dispositivo
                    </div>
                  )}
                </div>
              );
            })}
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
  infoText: {
    margin: '8px 0',
    color: '#2d3748',
    lineHeight: '1.6',
    fontSize: '14px',
  },
  devicesSection: {
    background: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '12px',
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#495057',
  },
  devicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  deviceCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    background: '#f8f9fa',
    border: '2px solid #dee2e6',
    borderRadius: '12px',
    transition: 'box-shadow 0.3s',
  },
  deviceCardCurrent: {
    border: '2px solid #667eea',
    background: '#f7fafc',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  deviceName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
  },
  deviceDetails: {
    fontSize: '13px',
    color: '#6c757d',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  masterBadge: {
    display: 'inline-block',
    marginTop: '8px',
    padding: '4px 12px',
    background: '#ffd700',
    color: '#333',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
  },
  deviceActions: {
    display: 'flex',
    gap: '8px',
  },
  authorizeButton: {
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
  revokeButton: {
    padding: '8px 16px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'opacity 0.3s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  currentDeviceLabel: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '14px',
    padding: '24px',
  },
};
