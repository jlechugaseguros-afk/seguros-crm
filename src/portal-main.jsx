import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Portal from './Portal.jsx'

// Entrada propia del portal de clientes (no carga el CRM).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Portal />
  </StrictMode>,
)
