import { useState, useEffect, useRef } from 'react';
import Auth from './components/Auth';
import FileManager from './components/FileManager';
import DeviceManager from './components/DeviceManager';
import { socketService } from './services/socket';
import {
  isAuthenticated,
  hasCriptographyCode,
  clearAllStorage,
  getUserEmail,
} from './utils/storage';

type Screen = 'auth' | 'dashboard';
type DashboardTab = 'files' | 'devices';

function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [activeTab, setActiveTab] = useState<DashboardTab>('files');
  
  // Ref para prevenir double-connect no React Strict Mode
  const socketInitialized = useRef(false);

  useEffect(() => {
    console.log('[App] 🚀 useEffect principal executado');
    
    // Verificar parâmetro revoked na URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('revoked') === 'true') {
      console.log('[App] ⚠️ Parâmetro revoked detectado na URL');
      alert('🚫 Seu dispositivo foi revogado por outro dispositivo.\n\nFaça login novamente para continuar.');
      clearAllStorage();
      setScreen('auth');
      return;
    }

    // Determinar tela inicial: Auth ou Dashboard
    const authenticated = isAuthenticated();
    const hasCrypto = hasCriptographyCode();
    console.log('[App] Estado de autenticação:', { authenticated, hasCrypto });

    if (authenticated && hasCrypto) {
      console.log('[App] ✅ Usuário autenticado, mudando para dashboard');
      setScreen('dashboard');
      
      // Conectar Socket.IO quando autenticado (apenas uma vez)
      if (!socketInitialized.current) {
        socketInitialized.current = true;
        console.log('[App] 🔌 Iniciando conexão socket (primeira vez)...');
        (async () => {
          try {
            console.log('[App] 🔄 Chamando socketService.connect()...');
            await socketService.connect();
            console.log('[App] ✅ Socket conectado com sucesso!');
          } catch (err) {
            console.error('[App] ❌ Falha ao conectar socket:', err);
            socketInitialized.current = false; // Permite tentar novamente
          }
        })();
      } else {
        console.log('[App] ⚠️ Socket já foi inicializado, pulando reconexão');
      }
    } else {
      console.log('[App] ⚠️ Usuário não autenticado, mostrando tela de login');
      setScreen('auth');
    }

    // Configurar ping periódico para manter conexão ativa
    const pingInterval = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.sendPing();
      }
    }, 30000); // Ping a cada 30 segundos

    // Cleanup - IMPORTANTE: Não desconectar no cleanup para evitar desconexão no React Strict Mode
    return () => {
      console.log('[App] 🧹 Cleanup do useEffect - removendo apenas ping interval');
      clearInterval(pingInterval);
      // NÃO desconectar o socket aqui para prevenir desconexão prematura no Strict Mode
      // socketService.disconnect();
    };
  }, []);

  const handleAuthSuccess = async () => {
    console.log('[App] 🎉 handleAuthSuccess chamado - mudando para dashboard');
    setScreen('dashboard');
    
    // Conectar Socket.IO após login bem-sucedido
    console.log('[App] 🔌 Conectando socket após login...');
    try {
      console.log('[App] 🔄 Chamando socketService.connect()...');
      await socketService.connect();
      console.log('[App] ✅ Socket conectado com sucesso após login!');
    } catch (err) {
      console.error('[App] ❌ Falha ao conectar socket após login:', err);
    }
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      console.log('[App] 🚪 Logout: desconectando socket e limpando storage');
      // Desconectar Socket.IO antes de limpar storage
      socketService.disconnect();
      clearAllStorage();
      socketInitialized.current = false; // Permite reconectar após novo login
      setScreen('auth');
    }
  };

  if (screen === 'auth') {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>🔐 Maask</h1>
          <div style={styles.userInfo}>
            <span style={styles.userEmail}>👤 {getUserEmail()}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Sair
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <button
            onClick={() => setActiveTab('files')}
            style={{
              ...styles.navTab,
              ...(activeTab === 'files' ? styles.navTabActive : {}),
            }}
          >
            📁 Arquivos
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            style={{
              ...styles.navTab,
              ...(activeTab === 'devices' ? styles.navTabActive : {}),
            }}
          >
            🖥️ Dispositivos
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={styles.main}>
        <div style={styles.content}>
          {activeTab === 'files' ? <FileManager /> : <DeviceManager />}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          🔒 Todos os arquivos são criptografados com AES-256-GCM •
          Chave gerada pelo servidor e acessível em dispositivos autorizados
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    gap: '0',
  },
  navTab: {
    padding: '16px 24px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    color: '#666',
    transition: 'all 0.3s',
  },
  navTabActive: {
    color: '#667eea',
    borderBottomColor: '#667eea',
    background: '#f8f9ff',
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
