import { useState } from 'react';
import { login, register } from '../services/api';
import { saveTokens, saveUserEmail } from '../utils/storage';

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'register') {
        // Registro
        const response = await register({ name, email, password });
        setMessage(`✅ ${response.message} - Faça login para continuar`);
        setMode('login');
        setPassword('');
      } else {
        // Login
        const response = await login({ email, password });
        saveTokens(response.accessToken, response.refreshToken);
        saveUserEmail(email);
        setMessage('✅ Login realizado com sucesso!');
        setTimeout(() => onAuthSuccess(), 500);
      }
    } catch (error) {
      setMessage(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔐 Maask E2EE</h1>
        <p style={styles.subtitle}>
          {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'register' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Nome:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={styles.input}
                placeholder="Seu nome completo"
              />
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="seu@email.com"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Senha:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{...styles.button, ...(loading ? styles.buttonDisabled : {})}}
          >
            {loading ? '⏳ Aguarde...' : mode === 'login' ? '🔓 Entrar' : '✍️ Registrar'}
          </button>
        </form>

        {message && (
          <div style={{
            ...styles.message,
            ...(message.includes('✅') ? styles.messageSuccess : styles.messageError)
          }}>
            {message}
          </div>
        )}

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setMessage('');
          }}
          style={styles.switchButton}
        >
          {mode === 'login' 
            ? '📝 Não tem conta? Registre-se' 
            : '🔙 Já tem conta? Faça login'}
        </button>
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '8px',
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '30px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.3s',
    outline: 'none',
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'opacity 0.3s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    marginTop: '16px',
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
  switchButton: {
    marginTop: '20px',
    padding: '10px',
    background: 'transparent',
    color: '#667eea',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    textDecoration: 'underline',
  },
};
