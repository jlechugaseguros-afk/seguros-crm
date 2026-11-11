import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

const PAGINA = 60
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

async function leerEscuelas() {
  const filas = []
  for (let desde = 0; desde < 20000; desde += 1000) {
    const { data, error } = await supabase.from('snte_escuelas').select('*').order('nombre').range(desde, desde + 999)
    if (error) return { error }
    filas.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return { filas }
}

// Escuelas asignadas al asesor: consulta y búsqueda (CCT, nombre, municipio, localidad, dirección).
export default function SnteEscuelas({ soyAdmin }) {
  const [filas, setFilas] = useState(null)
  const [error, setError] = useState('')
  const [nivel, setNivel] = useState('')
  const [turno, setTurno] = useState('')
  const [q, setQ] = useState('')
  const [visibles, setVisibles] = useState(PAGINA)

  const cargar = useCallback(async () => {
    setError('')
    const r = await leerEscuelas()
    if (r.error) { setError('No se pudieron cargar tus escuelas. Revisa tu conexión.'); setFilas([]); return }
    setFilas(r.filas)
  }, [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { setVisibles(PAGINA) }, [nivel, turno, q])

  const niveles = useMemo(() => [...new Set((filas || []).map((f) => f.nivel).filter(Boolean))].sort(), [filas])
  const turnos = useMemo(() => [...new Set((filas || []).map((f) => f.turno).filter(Boolean))].sort(), [filas])
  const lista = useMemo(() => {
    const nq = norm(q)
    return (filas || []).filter((f) => {
      if (nivel && f.nivel !== nivel) return false
      if (turno && f.turno !== turno) return false
      if (nq && !norm(`${f.cct} ${f.nombre} ${f.municipio} ${f.localidad} ${f.direccion}`).includes(nq)) return false
      return true
    })
  }, [filas, nivel, turno, q])

  return (
    <div>
      <p className="snte-sub">{filas ? `${filas.length} escuelas asignadas` : 'Cargando…'}</p>
      <div className="snte-grid2" style={{ marginTop: 8 }}>
        <select className="snte-select" aria-label="Nivel educativo" value={nivel} onChange={(e) => setNivel(e.target.value)}>
          <option value="">Todos los niveles</option>
          {niveles.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="snte-select" aria-label="Turno" value={turno} onChange={(e) => setTurno(e.target.value)}>
          <option value="">Todos los turnos</option>
          {turnos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ position: 'relative', margin: '8px 0 12px' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--stone)' }} />
        <input className="snte-input" style={{ paddingLeft: 36 }} placeholder="Buscar por CCT, escuela, municipio o dirección" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error && <p className="snte-error">{error}</p>}
      {filas && filas.length === 0 && !error && (
        <div className="snte-card" style={{ textAlign: 'center', padding: 24 }}>
          <b>Todavía no tienes escuelas asignadas</b>
          <p className="snte-sub" style={{ marginTop: 6 }}>
            {soyAdmin ? 'Súbelas desde Más → Gestionar cartera.' : 'McBrokers te las asignará pronto.'}
          </p>
        </div>
      )}
      {filas && filas.length > 0 && (
        <div className="snte-card">
          {lista.length === 0 && <p className="snte-sub" style={{ textAlign: 'center' }}>Ninguna escuela coincide con los filtros.</p>}
          {lista.slice(0, visibles).map((f) => {
            const ubicacion = [f.direccion, f.localidad, f.municipio].filter(Boolean).join(', ')
            return (
              <div className="snte-fila" key={f.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <b style={{ fontSize: 14 }}>{f.nombre}</b>
                  {f.cct && <span className="snte-pill gris">{f.cct}</span>}
                </div>
                <div className="snte-sub" style={{ marginTop: 2 }}>
                  {[f.nivel, f.control, f.turno].filter(Boolean).join(' · ')}
                </div>
                {ubicacion && (
                  <div className="snte-sub" style={{ marginTop: 2 }}>{[f.municipio, f.localidad].filter(Boolean).join(' · ')}{f.direccion ? ` — ${f.direccion}` : ''}</div>
                )}
                {ubicacion && (
                  <a className="snte-btn sec chico" style={{ marginTop: 8 }} target="_blank" rel="noopener noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.nombre} ${ubicacion} Puebla`)}`}>
                    <MapPin size={14} /> Ver en el mapa
                  </a>
                )}
              </div>
            )
          })}
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
