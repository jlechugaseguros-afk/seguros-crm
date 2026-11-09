import React, { useEffect, useMemo, useState } from 'react'

// Simulador de comisiones mensuales. Comisión = pólizas × prima mensual promedio × 12 × % de comisión.
// Porcentajes iniciales tomados de la tabla de comisiones por subramo del CRM (Vida, GMM, Autos); son editables.
const RAMOS = [
  { id: 'vida', nombre: 'Vida', detalle: 'GNP Vida Más', polizas: 4, prima: 1200, pct: 22 },
  { id: 'salud', nombre: 'Salud', detalle: 'QSalud Qualitas', polizas: 2, prima: 1500, pct: 11 },
  { id: 'autos', nombre: 'Autos', detalle: 'GNP · ANA · Qualitas', polizas: 3, prima: 1000, pct: 10 },
]
const CLAVE = 'snte_simulador_v1'

const money = (v) => '$' + Math.round(v).toLocaleString('es-MX')
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : 0 }

function leer() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null')
    if (g && g.ramos) return g
  } catch { /* sin datos guardados */ }
  return null
}

export default function SnteSimulador() {
  const inicial = useMemo(() => leer(), [])
  const [ramos, setRamos] = useState(() => RAMOS.map((r) => ({ ...r, ...(inicial?.ramos?.[r.id] || {}) })))
  const [meta1, setMeta1] = useState(inicial?.meta1 ?? 20000)
  const [meta2, setMeta2] = useState(inicial?.meta2 ?? 25000)

  const filas = ramos.map((r) => ({ ...r, comision: num(r.polizas) * num(r.prima) * 12 * num(r.pct) / 100 }))
  const total = filas.reduce((s, r) => s + r.comision, 0)
  const polizasTotal = filas.reduce((s, r) => s + num(r.polizas), 0)
  const metaMayor = Math.max(num(meta1), num(meta2))
  const avance = metaMayor > 0 ? Math.min(100, (total / metaMayor) * 100) : 0

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({
        meta1, meta2, ramos: Object.fromEntries(ramos.map((r) => [r.id, { polizas: r.polizas, prima: r.prima, pct: r.pct }])),
      }))
      localStorage.setItem('snte_sim_resumen', JSON.stringify({ total, meta: metaMayor }))
    } catch { /* sin almacenamiento local */ }
  }, [ramos, meta1, meta2, total, metaMayor])

  const cambiar = (id, campo, valor) => setRamos((rs) => rs.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)))

  const estado = (meta) => {
    const m = num(meta)
    return total >= m
      ? <span className="snte-pill ok">Alcanzada</span>
      : <span className="snte-pill gris">Faltan {money(m - total)}</span>
  }

  const falta = Math.max(0, metaMayor - total)

  return (
    <div>
      <span className="snte-etiqueta">Herramienta</span>
      <h1 className="snte-h1">Simulador de comisiones</h1>
      <p className="snte-sub">Mueve las pólizas y escribe la prima mensual promedio de cada ramo.</p>

      {filas.map((r) => (
        <div className="snte-card" key={r.id} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div><b style={{ fontSize: 15 }}>{r.nombre}</b> <span className="snte-sub">· {r.detalle}</span></div>
            <b style={{ fontSize: 20, color: 'var(--snte-dark)' }}>{money(r.comision)}</b>
          </div>
          <div className="snte-sub" style={{ marginTop: 6 }}>Pólizas: <b style={{ color: 'var(--snte-deep)' }}>{num(r.polizas)}</b></div>
          <input type="range" min="0" max="30" step="1" value={num(r.polizas)} aria-label={`Pólizas de ${r.nombre}`}
            onChange={(e) => cambiar(r.id, 'polizas', Number(e.target.value))} style={{ width: '100%', accentColor: '#E8791D', margin: '6px 0 10px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 10 }}>
            <div>
              <label className="snte-label" htmlFor={`prima-${r.id}`}>Prima mensual promedio por póliza</label>
              <input id={`prima-${r.id}`} className="snte-input" type="number" inputMode="decimal" min="0" value={r.prima}
                onChange={(e) => cambiar(r.id, 'prima', e.target.value)} />
            </div>
            <div>
              <label className="snte-label" htmlFor={`pct-${r.id}`}>% comisión</label>
              <input id={`pct-${r.id}`} className="snte-input" type="number" inputMode="decimal" min="0" max="100" value={r.pct}
                onChange={(e) => cambiar(r.id, 'pct', e.target.value)} />
            </div>
          </div>
        </div>
      ))}

      <div className="snte-card" style={{ marginTop: 14, background: 'var(--snte-soft)', borderColor: '#F2C79B' }}>
        <div className="snte-sub">Comisión mensual proyectada</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--snte-dark)' }}>{money(total)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span className="snte-sub">Pólizas totales</span><b>{polizasTotal}</b>
        </div>
        <div className="snte-bar" style={{ margin: '12px 0 4px', background: '#fff' }}><div style={{ width: `${avance}%` }} /></div>
        <div className="snte-sub" style={{ fontSize: 12, marginBottom: 10 }}>Avance hacia la meta mayor</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span className="snte-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Meta mínima <input className="snte-input" style={{ width: 100, padding: '5px 8px', fontSize: 13 }} type="number" min="0" aria-label="Meta mínima" value={meta1} onChange={(e) => setMeta1(e.target.value)} />
          </span>
          {estado(meta1)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span className="snte-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Meta mayor <input className="snte-input" style={{ width: 100, padding: '5px 8px', fontSize: 13 }} type="number" min="0" aria-label="Meta mayor" value={meta2} onChange={(e) => setMeta2(e.target.value)} />
          </span>
          {estado(meta2)}
        </div>
        {falta > 0 && (
          <p className="snte-sub" style={{ marginTop: 12, fontSize: 12 }}>
            Para cubrir los {money(falta)} que faltan necesitarías{' '}
            {filas.filter((r) => num(r.prima) * num(r.pct) > 0).map((r, i, a) => {
              const porPoliza = num(r.prima) * 12 * num(r.pct) / 100
              return `${Math.ceil(falta / porPoliza)} póliza${Math.ceil(falta / porPoliza) === 1 ? '' : 's'} más de ${r.nombre}${i < a.length - 1 ? ', o ' : ''}`
            }).join('')}.
          </p>
        )}
      </div>
      <p className="snte-sub" style={{ fontSize: 12, marginTop: 10 }}>
        Estimación bruta: supone prima mensual anualizable a 12 meses, porcentajes completos y reconocimiento de todas las pólizas.
      </p>
    </div>
  )
}
