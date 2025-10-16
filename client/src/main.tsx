import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// NOTA: StrictMode habilitado. A proteção contra double-mount está implementada
// no App.tsx usando useRef para prevenir desconexão prematura do socket
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
