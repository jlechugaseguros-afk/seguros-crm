import React, { useState } from 'react'
import { Heart, Stethoscope, Car, ChevronDown } from 'lucide-react'

// Guía rápida de los 3 productos del Espacio SNTE. Los accesos son los mismos del Multicotizador del CRM.
const PRODUCTOS = [
  {
    id: 'vida', nombre: 'Vida', Icono: Heart,
    aseguradoras: [{ n: 'GNP Vida Más', url: 'https://portalintermediarios.gnp.com.mx/sesion' }],
    documentos: ['Identificación oficial vigente', 'CURP y RFC', 'Comprobante de domicilio', 'Datos de los beneficiarios'],
    preguntas: ['¿Quién depende de tu ingreso hoy?', '¿Qué pasaría con tu familia si faltaras mañana?', '¿Cuánto tiempo podrían mantener su nivel de vida?'],
  },
  {
    id: 'salud', nombre: 'Salud', Icono: Stethoscope,
    aseguradoras: [{ n: 'QSalud Qualitas', url: 'https://www.qualitassalud.com.mx/web/guest/home' }],
    documentos: ['Identificación oficial vigente', 'Datos de cada asegurado (nombre, fecha de nacimiento)', 'Comprobante de domicilio', 'Cuestionario médico'],
    preguntas: ['¿Cuentas con un seguro médico hoy?', '¿Qué hospitales usarías si tuvieras un imprevisto?', '¿Cómo cubrirías una cirugía mayor?'],
  },
  {
    id: 'autos', nombre: 'Autos', Icono: Car,
    aseguradoras: [
      { n: 'GNP', url: 'https://portalintermediarios.gnp.com.mx/sesion' },
      { n: 'ANA Seguros', url: 'https://www.anaseguros.com.mx/anaweb/' },
      { n: 'Qualitas', url: 'https://agentes360.qualitas.com.mx/web/guest/home' },
      { n: 'Chubb', proximamente: true },
    ],
    documentos: ['Tarjeta de circulación o factura', 'Identificación oficial vigente', 'Comprobante de domicilio', 'Licencia de conducir'],
    preguntas: ['¿Cuándo vence tu póliza actual?', '¿Qué cobertura tienes hoy?', '¿Quién maneja el auto habitualmente?'],
  },
]

function Producto({ p, abierto, onAlternar }) {
  const Icono = p.Icono
  return (
    <div className="snte-card snte-acordeon" style={{ marginTop: 10 }}>
      <button type="button" onClick={onAlternar} aria-expanded={abierto}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--snte-soft)', color: 'var(--snte-dark)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icono size={20} />
        </span>
        <span style={{ flex: 1 }}><b style={{ fontSize: 16 }}>{p.nombre}</b></span>
        <ChevronDown size={18} style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {abierto && (
        <div style={{ marginTop: 12 }}>
          <div className="snte-label">Cotizar</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {p.aseguradoras.map((a) => a.url
              ? <a key={a.n} className="snte-btn chico" href={a.url} target="_blank" rel="noopener noreferrer">{a.n}</a>
              : <span key={a.n} className="snte-pill gris" style={{ padding: '7px 10px' }}>{a.n} · próximamente</span>)}
          </div>
          <div className="snte-label" style={{ marginTop: 14 }}>Documentos que normalmente se piden</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            {p.documentos.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <div className="snte-label" style={{ marginTop: 14 }}>Preguntas para la cita</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            {p.preguntas.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <p className="snte-sub" style={{ fontSize: 12, marginTop: 12 }}>
            Los requisitos finales los define cada aseguradora. Los formatos y la publicidad están en Más → Material.
          </p>
        </div>
      )}
    </div>
  )
}

export default function SnteProductos() {
  const [abierto, setAbierto] = useState('vida')
  return (
    <div>
      <span className="snte-etiqueta">Guía rápida</span>
      <h1 className="snte-h1">Mis 3 productos</h1>
      <p className="snte-sub">Todo lo necesario para cotizar y cerrar, sin ruido.</p>
      {PRODUCTOS.map((p) => (
        <Producto key={p.id} p={p} abierto={abierto === p.id} onAlternar={() => setAbierto((a) => (a === p.id ? '' : p.id))} />
      ))}
    </div>
  )
}
