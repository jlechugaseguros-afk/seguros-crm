import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './storage.js'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'
import TarjetaPublica from './TarjetaPublica.jsx'

const path = window.location.pathname
const publicMatch = path.match(/^\/t\/([^/]+)\/?$/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {publicMatch ? (
      <TarjetaPublica agentId={publicMatch[1]} />
    ) : (
      <AuthGate>
        <App />
      </AuthGate>
    )}
  </StrictMode>,
)