import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import DeviceSetup from './components/DeviceSetup';
import FileManager from './components/FileManager';
import DeviceManager from './components/DeviceManager';
import {
  isAuthenticated,
  hasDeviceSetup,
  hasMDK,
  clearAllStorage,
  getUserEmail,
} from './utils/storage';

type Screen = 'auth' | 'device-setup' | 'dashboard';
type Tab = 'files' | 'devices';

function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [tab, setTab] = useState<Tab>('files');

  useEffect(() => {
    // Determinar tela inicial
    if (!isAuthenticated()) {
      setScreen('auth');
    } else if (!hasDeviceSetup() || !hasMDK()) {
      setScreen('device-setup');
    } else {
      setScreen('dashboard');
    }
  }, []);

  const handleAuthSuccess = () => {
    if (hasDeviceSetup() && hasMDK()) {
      setScreen('dashboard');
    } else {
      setScreen('device-setup');
    }
  };

  const handleSetupComplete = () => {
    setScreen('dashboard');
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      clearAllStorage();
      setScreen('auth');
      setTab('files');
    }
  };

  if (screen === 'auth') {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (screen === 'device-setup') {
    return <DeviceSetup onSetupComplete={handleSetupComplete} />;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>🔐 Maask E2EE</h1>
          <div style={styles.userInfo}>
            <span style={styles.userEmail}>👤 {getUserEmail()}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Sair
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        <button
          onClick={() => setTab('files')}
          style={{
            ...styles.navButton,
            ...(tab === 'files' ? styles.navButtonActive : {}),
          }}
        >
          📁 Arquivos
        </button>
        <button
          onClick={() => setTab('devices')}
          style={{
            ...styles.navButton,
            ...(tab === 'devices' ? styles.navButtonActive : {}),
          }}
        >
          🖥️ Dispositivos
        </button>
      </nav>

      {/* Content */}
      <main style={styles.main}>
        <div style={styles.content}>
          {tab === 'files' && <FileManager />}
          {tab === 'devices' && <DeviceManager />}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          🔒 Todos os arquivos são criptografados ponta a ponta (E2EE) • 
          Chaves privadas nunca saem do seu dispositivo
        </p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#f5f7fa',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '16px 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userEmail: {
    fontSize: '14px',
    fontWeight: '500',
  },
  logoutButton: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.3s',
  },
  nav: {
    background: 'white',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px 24px',
  },
  navButton: {
    padding: '12px 24px',
    background: 'transparent',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  navButtonActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  main: {
    flex: 1,
    padding: '32px 24px',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  footer: {
    background: 'white',
    borderTop: '1px solid #e0e0e0',
    padding: '16px 24px',
    textAlign: 'center',
  },
  footerText: {
    margin: 0,
    fontSize: '13px',
    color: '#666',
  },
};

export default App;
