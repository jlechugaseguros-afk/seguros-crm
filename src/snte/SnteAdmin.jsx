import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient.js'
import { RESULTADOS } from './SnteCartera.jsx'

// Panel del administrador: importa la cartera SNTE desde Excel y la reparte entre los asesores de McBrokers.
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const txt = (v) => (v === null || v === undefined ? '' : String(v).trim())
const digitos = (s) => String(s ?? '').replace(/\D/g, '')

const ALIAS = {
  nombre: ['nombre', 'nombre completo', 'docente', 'trabajador'],
  curp: ['curp'],
  seccion: ['seccion', 'sindicato'],
  turno: ['turno'],
  telefono: ['telefono', 'tel', 'celular', 'movil', 'whatsapp'],
  puesto: ['puesto', 'cargo', 'funcion'],
  ciudad: ['cd', 'ciudad', 'municipio'],
  escuela: ['escuela', 'centro de trabajo', 'plantel', 'cct'],
  resultado: ['resultado', 'estatus', 'estado'],
}
const BUSCA = {}
Object.entries(ALIAS).forEach(([campo, l]) => l.forEach((a) => { BUSCA[a] = campo }))

function resultadoDe(valor) {
  const t = norm(valor)
  if (!t) return { resultado: 'Sin contactar', comentarios: null }
  const directo = RESULTADOS.find((r) => norm(r) === t)
  if (directo) return { resultado: directo, comentarios: null }
  let resultado = 'Sin contactar'
  if (t.includes('no le interesa') || t.includes('no interesad')) resultado = 'No le interesa'
  else if (t.includes('volver a llamar') || t.includes('llamar')) resultado = 'Volver a llamar'
  else if (t.includes('no existe') || t.includes('fuera de servicio')) resultado = 'Número no existe'
  else if (t.includes('no contest')) resultado = 'No contestó'
  return { resultado, comentarios: txt(valor) }
}

function leerHoja(buffer, seccionDefecto) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
  const iHead = filas.findIndex((f) => f.some((c) => norm(c) === 'nombre' || norm(c) === 'nombre completo'))
  if (iHead < 0) return { error: 'No encontré una columna "nombre" en el archivo.' }
  const cols = {}
  filas[iHead].forEach((c, i) => { const campo = BUSCA[norm(c)]; if (campo && !(campo in cols)) cols[campo] = i })
  const celda = (f, campo) => (campo in cols ? txt(f[cols[campo]]) : '')
  const registros = []
  for (const f of filas.slice(iHead + 1)) {
    const nombre = celda(f, 'nombre')
    if (!nombre) continue
    const sec = (celda(f, 'seccion').match(/\b(23|51)\b/) || [])[1] || seccionDefecto || null
    const { resultado, comentarios } = resultadoDe(celda(f, 'resultado'))
    registros.push({
      nombre, curp: celda(f, 'curp').toUpperCase() || null, seccion: sec, turno: celda(f, 'turno').toUpperCase() || null,
      telefono: digitos(celda(f, 'telefono')) || null, puesto: celda(f, 'puesto').toUpperCase() || null,
      ciudad: celda(f, 'ciudad').toUpperCase() || null, escuela: celda(f, 'escuela') || null, resultado, comentarios,
    })
  }
  return { registros, columnas: Object.keys(cols) }
}

async function leerResumen() {
  const filas = []
  for (let desde = 0; desde < 50000; desde += 1000) {
    const { data, error } = await supabase.from('snte_cartera').select('id, asesor_id, seccion, turno, curp, telefono, nombre').range(desde, desde + 999)
    if (error) return { error }
    filas.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return { filas }
}

export default function SnteAdmin() {
  const [asesores, setAsesores] = useState([])
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  const [seccionDef, setSeccionDef] = useState('')
  const [asesorSel, setAsesorSel] = useState('')
  const [secFiltro, setSecFiltro] = useState('todas')
  const [turnoFiltro, setTurnoFiltro] = useState('')
  const [cantidad, setCantidad] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    const [a, r] = await Promise.all([supabase.rpc('snte_lista_asesores'), leerResumen()])
    if (a.error || r.error) setError('No se pudo leer la cartera. Verifica que tu cuenta sea administradora.')
    else { setAsesores(a.data || []); setFilas(r.filas) }
    setCargando(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const sinAsignar = useMemo(() => filas.filter((f) => !f.asesor_id), [filas])
  const turnos = useMemo(() => [...new Set(filas.map((f) => f.turno).filter(Boolean))].sort(), [filas])
  const porAsesor = useMemo(() => {
    const m = new Map()
    filas.forEach((f) => { if (f.asesor_id) m.set(f.asesor_id, (m.get(f.asesor_id) || 0) + 1) })
    return m
  }, [filas])
  const candidatos = useMemo(() => sinAsignar.filter((f) =>
    (secFiltro === 'todas' || f.seccion === secFiltro) && (!turnoFiltro || f.turno === turnoFiltro)), [sinAsignar, secFiltro, turnoFiltro])

  async function importar(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setTrabajando(true); setError(''); setMsg('')
    try {
      const { registros, error: err } = leerHoja(await archivo.arrayBuffer(), seccionDef)
      if (err) { setError(err); return }
      const clavesExistentes = new Set(filas.map((f) => (f.curp ? `c:${f.curp}` : `t:${f.telefono}|${norm(f.nombre)}`)))
      const nuevos = []
      for (const r of registros) {
        const k = r.curp ? `c:${r.curp}` : `t:${r.telefono}|${norm(r.nombre)}`
        if (clavesExistentes.has(k)) continue
        clavesExistentes.add(k)
        nuevos.push(r)
      }
      for (let i = 0; i < nuevos.length; i += 500) {
        const { error: ie } = await supabase.from('snte_cartera').insert(nuevos.slice(i, i + 500))
        if (ie) { setError('Se interrumpió la importación. Revisa el archivo e intenta de nuevo.'); break }
      }
      setMsg(`Importados ${nuevos.length} contactos nuevos. ${registros.length - nuevos.length} ya existían o estaban repetidos.`)
      await cargar()
    } catch {
      setError('No se pudo leer el archivo. Usa un Excel (.xlsx) o CSV.')
    } finally {
      setTrabajando(false)
    }
  }

  async function asignar() {
    setError(''); setMsg('')
    const n = Math.min(parseInt(cantidad, 10) || candidatos.length, candidatos.length)
    if (!asesorSel) { setError('Elige a qué asesor se asigna.'); return }
    if (n <= 0) { setError('No hay contactos sin asignar con esos filtros.'); return }
    setTrabajando(true)
    const ids = candidatos.slice(0, n).map((f) => f.id)
    let hechos = 0
    for (let i = 0; i < ids.length; i += 500) {
      const { data, error: e } = await supabase.rpc('snte_asignar', { p_ids: ids.slice(i, i + 500), p_asesor: asesorSel })
      if (e) { setError('No se pudo completar la asignación.'); break }
      hechos += data || 0
    }
    setTrabajando(false)
    if (hechos) setMsg(`Asignados ${hechos} contactos.`)
    await cargar()
  }

  return (
    <div>
      <span className="snte-etiqueta">Administrador</span>
      <h1 className="snte-h1">Cartera SNTE</h1>
      <p className="snte-sub">
        {cargando ? 'Cargando…' : `${filas.length} contactos · ${sinAsignar.length} sin asignar`}
      </p>
      {error && <p className="snte-error" role="alert">{error}</p>}
      {msg && <p className="snte-sub" style={{ color: '#1F6B2E', fontWeight: 600, marginTop: 8 }}>{msg}</p>}

      <div className="snte-card" style={{ marginTop: 12 }}>
        <b style={{ fontSize: 14 }}>1. Importar desde Excel</b>
        <p className="snte-sub" style={{ margin: '4px 0 10px' }}>
          Columnas que reconoce: nombre, CURP, sección, turno, teléfono, puesto, ciudad (cd), escuela y resultado. No duplica contactos ya cargados.
        </p>
        <label className="snte-label" htmlFor="snte-sec-def">Sección para filas que no la traen</label>
        <select id="snte-sec-def" className="snte-select" value={seccionDef} onChange={(e) => setSeccionDef(e.target.value)}>
          <option value="">Dejar sin sección</option>
          <option value="23">Sección 23</option>
          <option value="51">Sección 51</option>
        </select>
        <label className="snte-btn" style={{ marginTop: 10, cursor: trabajando ? 'default' : 'pointer', opacity: trabajando ? 0.6 : 1 }}>
          {trabajando ? 'Trabajando…' : 'Elegir archivo Excel o CSV'}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={importar} disabled={trabajando} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="snte-card" style={{ marginTop: 12 }}>
        <b style={{ fontSize: 14 }}>2. Asignar a un asesor</b>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          <select className="snte-select" aria-label="Asesor" value={asesorSel} onChange={(e) => setAsesorSel(e.target.value)}>
            <option value="">Elegir asesor</option>
            {asesores.filter((a) => a.activo).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <div className="snte-grid2">
            <select className="snte-select" aria-label="Sección" value={secFiltro} onChange={(e) => setSecFiltro(e.target.value)}>
              <option value="todas">Ambas secciones</option><option value="23">Sección 23</option><option value="51">Sección 51</option>
            </select>
            <select className="snte-select" aria-label="Turno" value={turnoFiltro} onChange={(e) => setTurnoFiltro(e.target.value)}>
              <option value="">Todos los turnos</option>
              {turnos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <input className="snte-input" type="number" min="1" inputMode="numeric" placeholder={`Cantidad (disponibles: ${candidatos.length})`}
            value={cantidad} onChange={(e) => setCantidad(e.target.value)} aria-label="Cantidad a asignar" />
          <button className="snte-btn" onClick={asignar} disabled={trabajando || cargando}>Asignar</button>
        </div>
      </div>

      <div className="snte-card" style={{ marginTop: 12 }}>
        <b style={{ fontSize: 14 }}>Cartera por asesor</b>
        {asesores.map((a) => (
          <div className="snte-fila" key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.nombre}</div>
              <div className="snte-sub" style={{ fontSize: 12 }}>{a.vinculado ? 'Ya entró al espacio' : 'Aún no ha entrado'}</div>
            </div>
            <span className="snte-pill">{porAsesor.get(a.id) || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
