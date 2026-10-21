import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './storage.js'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'
import TarjetaPublica from './TarjetaPublica.jsx'
import Portal from './Portal.jsx'
import Landing from './Landing.jsx'

const path = window.location.pathname
const publicMatch = path.match(/^\/t\/([^/]+)\/?$/)
const esLanding = /^\/inicio\/?$/.test(path)
const esPortal = /^\/portal\/?$/.test(path)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})

  // Al abrir o volver a la app, se quita el globito del ícono
  const limpiarGlobito = () => {
    if (document.visibilityState !== 'visible') return
    try {
      if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {})
    } catch (e) { /* sin soporte */ }
  }
  document.addEventListener('visibilitychange', limpiarGlobito)
  limpiarGlobito()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {esLanding ? (
      <Landing />
    ) : esPortal ? (
      <Portal />
    ) : publicMatch ? (
      <TarjetaPublica agentId={publicMatch[1]} />
    ) : (
      <AuthGate>
        <App />
      </AuthGate>
    )}
  </StrictMode>,
)