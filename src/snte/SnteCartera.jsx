import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Phone, MessageCircle, Search, UserPlus } from 'lucide-react'
import { supabase } from '../supabaseClient.js'
import SnteEscuelas from './SnteEscuelas.jsx'

export const RESULTADOS = ['Sin contactar', 'Volver a llamar', 'No contestó', 'Número no existe', 'No le interesa', 'Interesado', 'Cita', 'Cotización']
const PASAN_A_PROSPECTO = ['Interesado', 'Cita', 'Cotización']
const PAGINA = 60

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const soloDigitos = (s) => String(s ?? '').replace(/\D/g, '')

function clasePill(r) {
  if (r === 'Cita' || r === 'Cotización' || r === 'Interesado') return 'snte-pill ok'
  if (r === 'No le interesa' || r === 'Número no existe') return 'snte-pill no'
  if (r === 'Sin contactar') return 'snte-pill gris'
  return 'snte-pill'
}

async function leerTodo() {
  const filas = []
  for (let desde = 0; desde < 20000; desde += 1000) {
    const { data, error } = await supabase.from('snte_cartera').select('*').order('nombre').range(desde, desde + 999)
    if (error) return { error }
    filas.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return { filas }
}

function Fila({ f, abierta, onAbrir, onGuardado, nombreAsesor, onNuevoProspecto }) {
  const [resultado, setResultado] = useState(f.resultado)
  const [comentarios, setComentarios] = useState(f.comentarios || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const tel = soloDigitos(f.telefono)
  const wa = tel.length >= 10
    ? `https://wa.me/52${tel.slice(-10)}?text=${encodeURIComponent(`Hola ${String(f.nombre).split(' ')[0]}, soy ${nombreAsesor.split(' ')[0]} de McBrokers. ¿Tienes un minuto para platicarte sobre tu seguro?`)}`
    : null

  async function guardar() {
    setGuardando(true); setError('')
    const cambios = { resultado, comentarios: comentarios.trim() || null, ultimo_contacto: new Date().toISOString() }
    const { error: e } = await supabase.from('snte_cartera').update(cambios).eq('id', f.id)
    setGuardando(false)
    if (e) { setError('No se pudo guardar. Intenta de nuevo.'); return }
    onGuardado({ ...f, ...cambios })
  }

  async function pasarAProspecto() {
    setGuardando(true); setError('')
    const pid = onNuevoProspecto({
      nombre: f.nombre, telefono: f.telefono || '',
      notas: [f.puesto, f.escuela, f.turno, comentarios.trim()].filter(Boolean).join(' · '),
    })
    const { error: e } = await supabase.from('snte_cartera')
      .update({ prospecto_id: pid, resultado, comentarios: comentarios.trim() || null, ultimo_contacto: new Date().toISOString() }).eq('id', f.id)
    setGuardando(false)
    if (e) { setError('El prospecto se creó, pero no se pudo marcar en tu cartera.'); return }
    onGuardado({ ...f, prospecto_id: pid, resultado, comentarios: comentarios.trim() || null, ultimo_contacto: new Date().toISOString() })
  }

  return (
    <div className="snte-fila">
      <button type="button" onClick={onAbrir} aria-expanded={abierta}
        style={{ width: '100%', background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <b style={{ fontSize: 14 }}>{f.nombre}</b>
          <span className={clasePill(f.resultado)}>{f.resultado}</span>
        </div>
        <div className="snte-sub" style={{ marginTop: 2 }}>
          {[f.puesto, f.turno, f.seccion ? `Sección ${f.seccion}` : '', f.escuela || f.ciudad].filter(Boolean).join(' · ')}
        </div>
      </button>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {tel ? <a className="snte-btn chico" style={{ flex: 1 }} href={`tel:${tel}`}><Phone size={14} /> Llamar</a> : <span className="snte-pill gris">Sin teléfono</span>}
        {wa && <a className="snte-btn sec chico" style={{ flex: 1 }} href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
      </div>
      {abierta && (
        <div style={{ marginTop: 10 }}>
          <label className="snte-label" htmlFor={`res-${f.id}`}>Resultado de la llamada</label>
          <select id={`res-${f.id}`} className="snte-select" value={resultado} onChange={(e) => setResultado(e.target.value)}>
            {RESULTADOS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="snte-label" htmlFor={`com-${f.id}`} style={{ marginTop: 8 }}>Comentarios</label>
          <textarea id={`com-${f.id}`} className="snte-input" rows={2} value={comentarios} onChange={(e) => setComentarios(e.target.value)} />
          {error && <p className="snte-error">{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="snte-btn chico" onClick={guardar} disabled={guardando}>Guardar</button>
            {PASAN_A_PROSPECTO.includes(resultado) && !f.prospecto_id && (
              <button className="snte-btn sec chico" onClick={pasarAProspecto} disabled={guardando}><UserPlus size={14} /> Pasar a prospecto</button>
            )}
            {f.prospecto_id && <span className="snte-pill ok">Ya es prospecto</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function CarteraClientes({ onSeccion, nombreAsesor, onNuevoProspecto, soyAdmin }) {
  const [filas, setFilas] = useState(null)
  const [error, setError] = useState('')
  const [filtroSeccion, setFiltroSeccion] = useState('todas')
  const [turno, setTurno] = useState('')
  const [resultado, setResultado] = useState('')
  const [q, setQ] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [visibles, setVisibles] = useState(PAGINA)

  const cargar = useCallback(async () => {
    setError('')
    const r = await leerTodo()
    if (r.error) { setError('No se pudo cargar tu cartera. Revisa tu conexión.'); setFilas([]); return }
    setFilas(r.filas)
  }, [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { setVisibles(PAGINA) }, [filtroSeccion, turno, resultado, q])

  const turnos = useMemo(() => [...new Set((filas || []).map((f) => f.turno).filter(Boolean))].sort(), [filas])
  const lista = useMemo(() => {
    const nq = norm(q)
    return (filas || []).filter((f) => {
      if (filtroSeccion !== 'todas' && f.seccion !== filtroSeccion) return false
      if (turno && f.turno !== turno) return false
      if (resultado && f.resultado !== resultado) return false
      if (nq && !norm(`${f.nombre} ${f.escuela} ${f.telefono} ${f.puesto}`).includes(nq)) return false
      return true
    })
  }, [filas, filtroSeccion, turno, resultado, q])

  const pendientes = (filas || []).filter((f) => f.resultado === 'Sin contactar' || f.resultado === 'Volver a llamar').length

  function elegirSeccion(s) {
    setFiltroSeccion(s)
    if (s !== 'todas') onSeccion(s)
  }

  return (
    <div>
      <span className="snte-etiqueta">Cartera asignada</span>
      <h1 className="snte-h1">Mi cartera</h1>
      <p className="snte-sub">{filas ? `${filas.length} asignados · ${pendientes} pendientes de llamar` : 'Cargando…'}</p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0 8px' }}>
        {[['todas', 'Todas'], ['23', 'Sección 23'], ['51', 'Sección 51']].map(([id, label]) => (
          <button key={id} type="button" className={'snte-chip' + (filtroSeccion === id ? ' on' : '')} onClick={() => elegirSeccion(id)}>{label}</button>
        ))}
      </div>
      <div className="snte-grid2">
        <select className="snte-select" aria-label="Turno" value={turno} onChange={(e) => setTurno(e.target.value)}>
          <option value="">Todos los turnos</option>
          {turnos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="snte-select" aria-label="Resultado" value={resultado} onChange={(e) => setResultado(e.target.value)}>
          <option value="">Todos los resultados</option>
          {RESULTADOS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div style={{ position: 'relative', margin: '8px 0 12px' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--stone)' }} />
        <input className="snte-input" style={{ paddingLeft: 36 }} placeholder="Buscar por nombre, escuela o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error && <p className="snte-error">{error}</p>}
      {filas && filas.length === 0 && !error && (
        <div className="snte-card" style={{ textAlign: 'center', padding: 24 }}>
          <b>Todavía no tienes cartera asignada</b>
          <p className="snte-sub" style={{ marginTop: 6 }}>
            {soyAdmin ? 'Impórtala y asígnala desde Más → Gestionar cartera.' : 'McBrokers te la asignará pronto.'}
          </p>
        </div>
      )}
      {filas && filas.length > 0 && (
        <div className="snte-card">
          {lista.length === 0 && <p className="snte-sub" style={{ textAlign: 'center' }}>Ningún contacto coincide con los filtros.</p>}
          {lista.slice(0, visibles).map((f) => (
            <Fila key={f.id} f={f} abierta={abierta === f.id} nombreAsesor={nombreAsesor} onNuevoProspecto={onNuevoProspecto}
              onAbrir={() => setAbierta((a) => (a === f.id ? null : f.id))}
              onGuardado={(nueva) => { setFilas((fs) => fs.map((x) => (x.id === nueva.id ? nueva : x))); setAbierta(null) }} />
          ))}
          {lista.length > visibles && (
            <button className="snte-btn sec" style={{ width: '100%', marginTop: 10 }} onClick={() => setVisibles((v) => v + PAGINA)}>
              Ver más ({lista.length - visibles} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Mi cartera: el asesor alterna entre sus clientes y sus escuelas asignadas.
export default function SnteCartera(props) {
  const [vista, setVista] = useState('clientes')
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }} role="group" aria-label="Tipo de cartera">
        {[['clientes', 'Clientes'], ['escuelas', 'Escuelas']].map(([id, label]) => (
          <button key={id} type="button" className={'snte-chip' + (vista === id ? ' on' : '')} aria-pressed={vista === id} onClick={() => setVista(id)}>{label}</button>
        ))}
      </div>
      {vista === 'clientes' ? <CarteraClientes {...props} /> : (
        <>
          <span className="snte-etiqueta">Cartera asignada</span>
          <h1 className="snte-h1">Mis escuelas</h1>
          <SnteEscuelas soyAdmin={props.soyAdmin} />
        </>
      )}
    </div>
  )
}
