import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Registra o service worker (PWA / offline). O bundle do SW é um módulo ES,
// então precisa ser registrado com { type: 'module' } — registrar como
// 'classic' (padrão) falha ao avaliar o script.
// Só em produção: em dev o /sw.js não existe.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { type: 'module', scope: '/' })
      .catch((err) => console.error('[PWA] Falha ao registrar service worker:', err))
  })
}

createRoot(document.getElementById('root')).render(<App />)
