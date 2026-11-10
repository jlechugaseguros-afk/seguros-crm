import React, { useEffect, useState } from 'react'
import { Heart, Stethoscope, Car } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

const PRODUCTOS = [
  { id: 'vida', nombre: 'Vida', detalle: 'GNP Vida Más', Icono: Heart },
  { id: 'salud', nombre: 'Salud', detalle: 'QSalud Qualitas', Icono: Stethoscope },
  { id: 'autos', nombre: 'Autos', detalle: 'Cotiza con Dora', Icono: Car },
]

const money = (v) => '$' + Math.round(v).toLocaleString('es-MX')

function primerNombre(n) {
  const p = String(n || '').trim().split(/\s+/)[0] || ''
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
}

export default function SnteHoy({ nombre, onIr, prospectosSnte }) {
  const [m, setM] = useState(null)
  const [error, setError] = useState('')
  let resumen = null
  try { resumen = JSON.parse(localStorage.getItem('snte_sim_resumen') || 'null') } catch { /* sin datos */ }

  useEffect(() => {
    let vigente = true
    ;(async () => {
      const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
      const cuenta = (f) => f(supabase.from('snte_cartera').select('id', { count: 'exact', head: true }))
      const [a, b, c, d] = await Promise.all([
        cuenta((q) => q.gte('ultimo_contacto', inicio.toISOString())),
        cuenta((q) => q.eq('resultado', 'Cita')),
        cuenta((q) => q.in('resultado', ['Sin contactar', 'Volver a llamar'])),
        cuenta((q) => q),
      ])
      if (!vigente) return
      if (a.error || d.error) { setError('No se pudo leer tu cartera.'); return }
      setM({ hoy: a.count || 0, citas: b.count || 0, pendientes: c.count || 0, total: d.count || 0 })
    })()
    return () => { vigente = false }
  }, [])

  const activos = (prospectosSnte || []).filter((p) => p.estado !== 'Cliente' && p.estado !== 'Perdido').length
  const avance = resumen && resumen.meta > 0 ? Math.min(100, (resumen.total / resumen.meta) * 100) : 0

  return (
    <div>
      <span className="snte-etiqueta">Espacio SNTE · McBrokers</span>
      <h1 className="snte-h1">Hola, {primerNombre(nombre)}</h1>
      <p className="snte-sub">Esto es lo que toca hoy.</p>

      <div className="snte-grid3" style={{ marginTop: 14 }}>
        <div className="snte-metrica"><small>Llamadas hoy</small><b>{m ? m.hoy : '–'}</b></div>
        <div className="snte-metrica"><small>Citas</small><b>{m ? m.citas : '–'}</b></div>
        <div className="snte-metrica"><small>Por llamar</small><b>{m ? m.pendientes : '–'}</b></div>
      </div>
      {error && <p className="snte-error">{error}</p>}

      <div className="snte-card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <b style={{ fontSize: 14 }}>Meta del mes</b>
          <span className="snte-sub">{resumen ? `${money(resumen.total)} de ${money(resumen.meta)}` : 'Aún sin simulación'}</span>
        </div>
        <div className="snte-bar" style={{ marginTop: 8 }}><div style={{ width: `${avance}%` }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span className="snte-sub">{m ? `${m.total} en tu cartera · ${activos} prospecto${activos === 1 ? '' : 's'} activo${activos === 1 ? '' : 's'}` : ' '}</span>
          <button className="snte-btn sec chico" onClick={() => onIr('simulador')}>Abrir simulador</button>
        </div>
      </div>

      <h2 style={{ fontSize: 13, color: 'var(--muted)', margin: '18px 0 8px', fontWeight: 700 }}>Mis 3 productos</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PRODUCTOS.map(({ id, nombre: n, detalle, Icono }) => (
          <button key={id} type="button" className="snte-card" onClick={() => onIr('productos')}
            style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--snte-soft)', color: 'var(--snte-dark)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icono size={20} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 15 }}>{n}</b>
              <span className="snte-sub">{detalle}</span>
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="snte-btn" style={{ flex: 1 }} onClick={() => onIr('cartera')}>Empezar a llamar</button>
        <button className="snte-btn sec" style={{ flex: 1 }} onClick={() => onIr('prospectos')}>Ver prospectos</button>
      </div>
    </div>
  )
}
