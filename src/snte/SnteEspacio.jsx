import React, { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, Users, UserPlus, Check, LayoutGrid, Calculator, FolderOpen, Upload, ChevronDown } from 'lucide-react'
import { supabase } from '../supabaseClient.js'
import { JL_LOGO } from '../brandAssets.js'
import './snte.css'
import SnteHoy from './SnteHoy.jsx'
import SnteCartera from './SnteCartera.jsx'
import SnteSimulador from './SnteSimulador.jsx'
import SnteProductos from './SnteProductos.jsx'
import SnteAdmin from './SnteAdmin.jsx'

const LOGOS_SECCION = { '23': '/snte/snte-23.png', '51': '/snte/snte-51.jpg' }

export async function invocarAcceso(body) {
  const { data, error } = await supabase.functions.invoke('snte-acceso', { body })
  if (error) {
    let d = data
    try { d = await error.context?.json?.() } catch { /* sin detalle */ }
    return { ok: false, error: d?.error || 'error', restantes: d?.restantes, minutos: d?.minutos }
  }
  return data?.error ? { ok: false, ...data } : { ok: true, ...data }
}

const MENSAJES = {
  credenciales: 'Correo o clave de asesor incorrectos.',
  bloqueado: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.',
  datos_invalidos: 'Revisa el correo y la clave de asesor.',
  sesion: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  error: 'No se pudo validar el acceso. Intenta de nuevo.',
}

function Gate({ onOk, onSalir, puedeSalir }) {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError('')
    if (!correo.trim() || !clave.trim()) { setError('Escribe tu correo y tu clave de asesor.'); return }
    setEnviando(true)
    const r = await invocarAcceso({ accion: 'entrar', correo, clave })
    setEnviando(false)
    if (!r.ok) {
      let m = MENSAJES[r.error] || MENSAJES.error
      if (r.error === 'credenciales' && typeof r.restantes === 'number') m += ` Te quedan ${r.restantes} intento${r.restantes === 1 ? '' : 's'}.`
      setError(m)
      return
    }
    onOk(r.nombre)
  }

  return (
    <div className="snte-gate snte-fade">
      <div className="snte-card" style={{ padding: 20 }}>
        <span className="snte-etiqueta">Acceso restringido</span>
        <h1 className="snte-h1">Espacio SNTE</h1>
        <p className="snte-sub" style={{ marginBottom: 16 }}>Escribe tu correo de McBrokers y tu clave de asesor para entrar.</p>
        <form onSubmit={enviar}>
          <label className="snte-label" htmlFor="snte-correo">Correo</label>
          <input id="snte-correo" className="snte-input" type="email" autoComplete="off" autoCapitalize="none"
            placeholder="nombre@mcbrokers.com.mx" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          <label className="snte-label" htmlFor="snte-clave" style={{ marginTop: 12 }}>Clave de asesor</label>
          <input id="snte-clave" className="snte-input" type="password" inputMode="numeric" autoComplete="off"
            placeholder="Clave de asesor" value={clave} onChange={(e) => setClave(e.target.value)} />
          {error && <p className="snte-error" role="alert">{error}</p>}
          <button type="submit" className="snte-btn" style={{ width: '100%', marginTop: 16 }} disabled={enviando}>
            {enviando ? 'Validando…' : 'Entrar al Espacio SNTE'}
          </button>
          {puedeSalir && (
            <button type="button" className="snte-btn sec" style={{ width: '100%', marginTop: 8 }} onClick={onSalir}>
              Volver al mercado privado
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

function ListaClientes({ clientes }) {
  if (!clientes.length) {
    return (
      <div className="snte-card" style={{ textAlign: 'center', padding: 24 }}>
        <b>Aún no tienes clientes SNTE</b>
        <p className="snte-sub" style={{ marginTop: 6 }}>Cuando conviertas un prospecto del Espacio SNTE a cliente, aparecerá aquí.</p>
      </div>
    )
  }
  return (
    <div className="snte-card">
      {clientes.map((c) => (
        <div className="snte-fila" key={c.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <b style={{ fontSize: 14 }}>{c.nombre}</b>
            <span className="snte-pill ok">{(c.polizas || []).length} póliza{(c.polizas || []).length === 1 ? '' : 's'}</span>
          </div>
          <div className="snte-sub">{c.telefono}{c.correo ? ` · ${c.correo}` : ''}</div>
          <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(c.polizas || []).map((p) => (
              <span className="snte-pill gris" key={p.id}>{[p.ramo, p.aseguradora].filter(Boolean).join(' · ')}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SnteEspacio({
  userId, soyAdmin, soloSnte, onSalir, clientesSnte, prospectosSnte, prospectosView, materialView, onNuevoProspecto,
}) {
  const claveSesion = `snte_ok_${userId || 'x'}`
  const [nombre, setNombre] = useState(() => {
    try { return sessionStorage.getItem(claveSesion) || '' } catch { return '' }
  })
  const [tab, setTab] = useState('hoy')
  const [seccion, setSeccion] = useState('23')
  const [verMas, setVerMas] = useState(false)

  const entrar = useCallback((n) => {
    try { sessionStorage.setItem(claveSesion, n || 'Asesor') } catch { /* sin sessionStorage */ }
    setNombre(n || 'Asesor')
  }, [claveSesion])

  // Al volver a la pantalla, el acceso sigue válido solo si la cuenta continúa ligada a un asesor activo
  useEffect(() => {
    if (!nombre) return
    let vigente = true
    invocarAcceso({ accion: 'estado' }).then((r) => {
      if (!vigente || !r.ok) return
      if (!r.vinculado) {
        try { sessionStorage.removeItem(claveSesion) } catch { /* nada */ }
        setNombre('')
      }
    })
    return () => { vigente = false }
  }, [nombre, claveSesion])

  const irA = (t) => { setTab(t); setVerMas(false); window.scrollTo?.(0, 0) }
  const masActivo = ['simulador', 'productos', 'material', 'admin'].includes(tab)

  return (
    <div className="snte-root" role="region" aria-label="Espacio SNTE">
      <header className="snte-head">
        <div className="snte-head-in">
          <div className="snte-logos">
            <img className="snte-logo-main" src={LOGOS_SECCION[seccion]} alt={`SNTE Sección ${seccion} Puebla`} />
            <div className="snte-logos-aliados">
              <img src="/mcbrokers-logo.png" alt="McBrokers" />
              <img className="snte-logo-jl" src={JL_LOGO} alt="J L Consultoría Patrimonial" />
            </div>
          </div>
          <div className="snte-selector" role="tablist" aria-label="Espacio de trabajo">
            <button type="button" role="tab" aria-selected="false" onClick={onSalir} disabled={soloSnte}>Mercado privado</button>
            <button type="button" role="tab" aria-selected="true" className="on">Espacio SNTE</button>
          </div>
        </div>
      </header>

      <main className="snte-main">
        {!nombre ? (
          <Gate onOk={entrar} onSalir={onSalir} puedeSalir={!soloSnte} />
        ) : (
          <div className="snte-fade" key={tab}>
            {tab === 'hoy' && (
              <SnteHoy nombre={nombre} onIr={irA} prospectosSnte={prospectosSnte} seccion={seccion} />
            )}
            {tab === 'cartera' && (
              <SnteCartera onSeccion={setSeccion} nombreAsesor={nombre} onNuevoProspecto={onNuevoProspecto} soyAdmin={soyAdmin} />
            )}
            {tab === 'prospectos' && prospectosView}
            {tab === 'clientes' && <ListaClientes clientes={clientesSnte} />}
            {tab === 'simulador' && <SnteSimulador />}
            {tab === 'productos' && <SnteProductos />}
            {tab === 'material' && materialView}
            {tab === 'admin' && soyAdmin && <SnteAdmin />}
          </div>
        )}
      </main>

      {nombre && (
        <>
          {verMas && (
            <div className="snte-card snte-fade" style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))', zIndex: 5, maxWidth: 520, margin: '0 auto' }}>
              <div className="snte-grid2">
                <button className="snte-btn sec" onClick={() => irA('simulador')}><Calculator size={16} /> Simulador</button>
                <button className="snte-btn sec" onClick={() => irA('productos')}><LayoutGrid size={16} /> Mis productos</button>
                <button className="snte-btn sec" onClick={() => irA('material')}><FolderOpen size={16} /> Material</button>
                {soyAdmin && <button className="snte-btn sec" onClick={() => irA('admin')}><Upload size={16} /> Cartera (admin)</button>}
              </div>
            </div>
          )}
          <nav className="snte-nav" aria-label="Secciones del Espacio SNTE">
            {[
              ['hoy', 'Hoy', LayoutDashboard],
              ['cartera', 'Mi cartera', Users],
              ['prospectos', 'Prospectos', UserPlus],
              ['clientes', 'Clientes', Check],
            ].map(([id, label, Icono]) => (
              <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => irA(id)} aria-current={tab === id ? 'page' : undefined}>
                <Icono size={20} />{label}
              </button>
            ))}
            <button type="button" className={masActivo || verMas ? 'on' : ''} onClick={() => setVerMas((v) => !v)} aria-expanded={verMas}>
              <ChevronDown size={20} style={{ transform: verMas ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />Más
            </button>
          </nav>
        </>
      )}
    </div>
  )
}
