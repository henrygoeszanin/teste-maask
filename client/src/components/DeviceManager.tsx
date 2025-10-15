import { useState, useEffect } from 'react';
import { listDevices, revokeDevice, deleteDevice } from '../services/api';
import { getDeviceName, clearAllStorage } from '../utils/storage';

interface Device {
  id: string;
  deviceName: string;
  status: 'active' | 'inactive' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export default function DeviceManager() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await listDevices();
      setDevices(response.devices);

      // Verificar se o dispositivo atual ainda está ativo
      const currentDeviceName = getDeviceName();
      const currentDevice = response.devices.find(d => d.deviceName === currentDeviceName);
      
      if (currentDevice && currentDevice.status !== 'active') {
        console.warn('[DeviceManager] Dispositivo atual não está ativo, fazendo logout');
        alert('Seu dispositivo foi revogado. Você será desconectado.');
        clearAllStorage();
        window.location.href = '/';
        return;
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
    }
  };

  const handleRevoke = async (device: Device) => {
    if (!confirm(`⚠️ Tem certeza que deseja revogar o dispositivo "${device.deviceName}"?\n\nEsta ação requer sua senha e não pode ser desfeita.`)) {
      return;
    }

    const password = prompt('🔒 Digite sua senha para confirmar a revogação:');
    if (!password) {
      setMessage('❌ Revogação cancelada - senha não fornecida');
      return;
    }

    setMessage('');
    setLoading(true);

    try {
      setMessage(`🚫 Revogando dispositivo ${device.deviceName}...`);
      await revokeDevice(device.deviceName, password, 'user_initiated');

      setMessage(`✅ Dispositivo "${device.deviceName}" revogado com sucesso!`);
      await loadDevices();
    } catch (error) {
      setMessage(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (device: Device) => {
    if (device.status !== 'revoked') {
      setMessage('❌ Apenas dispositivos revogados podem ser deletados. Revogue o dispositivo primeiro.');
      return;
    }

    if (!confirm(`⚠️ Tem certeza que deseja DELETAR permanentemente o dispositivo "${device.deviceName}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setMessage('');
    setLoading(true);

    try {
      setMessage(`🗑️ Deletando dispositivo ${device.deviceName}...`);
      await deleteDevice(device.id);

      setMessage(`✅ Dispositivo "${device.deviceName}" deletado com sucesso!`);
      await loadDevices();
    } catch (error) {
      setMessage(`❌ Erro ao deletar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const currentDeviceName = getDeviceName();

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { text: '✅ Ativo', color: '#28a745' },
      inactive: { text: '⚠️ Inativo', color: '#ffc107' },
      revoked: { text: '🚫 Revogado', color: '#dc3545' },
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
          Cada dispositivo é identificado por um nome único. Todos os dispositivos autorizados
          têm acesso à mesma chave de criptografia gerada pelo servidor.
        </p>
        <p style={styles.infoText}>
          Para revogar um dispositivo, clique em <strong>"Revogar"</strong>.
          Esta ação bloqueia o acesso à API mas não remove arquivos já baixados.
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
              const isCurrentDevice = device.deviceName === currentDeviceName;
              const badge = getStatusBadge(device.status);

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
                        {device.deviceName}
                      </span>
                      <span style={{...styles.statusBadge, background: badge.color}}>
                        {badge.text}
                      </span>
                    </div>
                    <div style={styles.deviceDetails}>
                      <div>📅 Criado: {new Date(device.createdAt).toLocaleString('pt-BR')}</div>
                      <div>🔄 Atualizado: {new Date(device.updatedAt).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>

                  {!isCurrentDevice && device.status === 'active' && (
                    <div style={styles.deviceActions}>
                      <button
                        onClick={() => handleRevoke(device)}
                        disabled={loading}
                        style={{
                          ...styles.revokeButton,
                          ...(loading ? styles.buttonDisabled : {})
                        }}
                      >
                        {loading ? '⏳ Revogando...' : '🚫 Revogar'}
                      </button>
                    </div>
                  )}

                  {!isCurrentDevice && device.status === 'revoked' && (
                    <div style={styles.deviceActions}>
                      <button
                        onClick={() => handleDelete(device)}
                        disabled={loading}
                        style={{
                          ...styles.deleteButton,
                          ...(loading ? styles.buttonDisabled : {})
                        }}
                      >
                        {loading ? '⏳ Deletando...' : '🗑️ Deletar'}
                      </button>
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
  deviceActions: {
    display: 'flex',
    gap: '8px',
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
    transition: 'opacity 0.3s, background 0.3s',
  },
  deleteButton: {
    padding: '8px 16px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'opacity 0.3s, background 0.3s',
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
