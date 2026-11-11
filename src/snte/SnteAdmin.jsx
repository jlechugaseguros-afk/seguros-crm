import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient.js'
import { RESULTADOS } from './SnteCartera.jsx'

// Panel del administrador: sube la cartera SNTE (clientes o escuelas) desde Excel directamente al asesor de McBrokers que la va a trabajar.
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

// Cartera de escuelas: CCT, Nombre de la escuela, Nivel educativo, Control, Turno, Municipio, Localidad, Dirección.
const ALIAS_ESC = {
  cct: ['cct', 'clave cct', 'clave del centro de trabajo', 'clave centro de trabajo', 'clave'],
  nombre: ['nombre de la escuela', 'nombre escuela', 'nombre del centro de trabajo', 'escuela', 'nombre', 'plantel'],
  nivel: ['nivel educativo', 'nivel'],
  control: ['control', 'subcontrol', 'sub control', 'sostenimiento'],
  turno: ['turno'],
  municipio: ['municipio'],
  localidad: ['localidad'],
  direccion: ['direccion', 'domicilio'],
}
const BUSCA_ESC = {}
Object.entries(ALIAS_ESC).forEach(([campo, l]) => l.forEach((a) => { BUSCA_ESC[a] = campo }))

const claveEscuela = (r) => (r.cct ? `c:${String(r.cct).toUpperCase()}|${norm(r.turno)}` : `n:${norm(r.nombre)}|${norm(r.municipio)}|${norm(r.turno)}`)

const PATRON_CCT = /^\d{2}[A-Z]{3}\d{4}[A-Z]$/i
const CAMPOS_ESC = [
  ['nombre', 'Nombre de la escuela'], ['cct', 'CCT'], ['turno', 'Turno'], ['municipio', 'Municipio'],
  ['localidad', 'Localidad'], ['direccion', 'Dirección'], ['nivel', 'Nivel'], ['control', 'Subcontrol'],
]

// Detecta a qué campo corresponde un encabezado (exacto primero; después por palabras clave).
function campoEscuela(encabezado) {
  const h = norm(encabezado)
  if (!h) return null
  if (BUSCA_ESC[h]) return BUSCA_ESC[h]
  if (h.includes('cct') || (h.includes('clave') && (h.includes('centro') || h.includes('trabajo') || h.includes('escuela')))) return 'cct'
  if (h.includes('turno')) return 'turno'
  if (h.includes('nivel')) return 'nivel'
  if (h.includes('control') || h.includes('sostenimiento')) return 'control'
  if (h.includes('municipio') || h.includes('mpio')) return 'municipio'
  if (h.includes('localidad') || h.includes('colonia')) return 'localidad'
  if (h.includes('direccion') || h.includes('domicilio') || h.includes('calle')) return 'direccion'
  if (h.includes('nombre') || h.includes('escuela') || h.includes('plantel')) return 'nombre'
  return null
}

// Cuando el encabezado no ayuda, se reconoce la columna por lo que contiene
const PALABRAS_CONTENIDO = {
  turno: ['matutin', 'vespertin', 'nocturn', 'discontinu', 'continu', 'jornada', 'tiempo completo', 'mixto'],
  nivel: ['preescolar', 'primaria', 'secundaria', 'bachillerato', 'licenciatura', 'inicial', 'especial', 'normal', 'telesecundaria', 'medio superior', 'superior', 'capacitacion', 'posgrado'],
  control: ['publico', 'privado', 'federal', 'estatal', 'particular', 'autonomo'],
}
function campoPorContenido(valores) {
  const v = valores.map(txt).filter(Boolean)
  if (v.length < 3) return null
  const proporcion = (fn) => v.filter(fn).length / v.length
  if (proporcion((x) => PATRON_CCT.test(x)) >= 0.8) return 'cct'
  for (const [campo, palabras] of Object.entries(PALABRAS_CONTENIDO)) {
    if (proporcion((x) => { const n = norm(x); return palabras.some((w) => n.includes(w)) }) >= 0.8) return campo
  }
  return null
}

// Lee cualquier Excel/CSV: busca en todas las hojas, ignora las columnas que no sirven y devuelve la asignación propuesta.
function analizarEscuelas(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' })
  let mejor = null
  for (const nombreHoja of wb.SheetNames) {
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[nombreHoja], { header: 1, defval: '', raw: false })
    if (!filas.length) continue
    const iHead = filas.slice(0, 30).findIndex((f) => f.filter((c) => campoEscuela(c)).length >= 2)
    const conEncabezado = iHead >= 0
    // Sin encabezados: todas las filas son datos y las columnas se identifican por su contenido
    const encabezados = conEncabezado ? filas[iHead].map((c) => txt(c)) : filas[0].map(() => '')
    const cuerpo = filas.slice(conEncabezado ? iHead + 1 : 0).filter((f) => f.some((c) => txt(c)))
    const cols = {}
    if (conEncabezado) encabezados.forEach((c, i) => { const campo = campoEscuela(c); if (campo && !(campo in cols)) cols[campo] = i })
    // Columnas que el encabezado no resolvió: se reconocen por su contenido
    const usadas = new Set(Object.values(cols))
    encabezados.forEach((_, i) => {
      if (usadas.has(i)) return
      const campo = campoPorContenido(cuerpo.slice(0, 60).map((f) => f[i]))
      if (campo && !(campo in cols)) { cols[campo] = i; usadas.add(i) }
    })
    // Si "nombre" trae claves CCT, en realidad es el CCT
    if ('nombre' in cols) {
      const muestra = cuerpo.slice(0, 30).map((f) => txt(f[cols.nombre])).filter(Boolean)
      if (muestra.length && muestra.every((x) => PATRON_CCT.test(x))) {
        if (!('cct' in cols)) cols.cct = cols.nombre
        delete cols.nombre
      }
    }
    const puntos = Object.keys(cols).length * 1000 + cuerpo.length
    if (cuerpo.length && (!mejor || puntos > mejor.puntos)) mejor = { hoja: nombreHoja, encabezados, cuerpo, cols, puntos }
  }
  if (!mejor || !Object.keys(mejor.cols).length) return { error: 'No pude identificar datos de escuelas en el archivo. Revisa que tenga las columnas de escuela (CCT, Nombre, Turno…).' }
  return mejor
}

function registrosEscuelas(cuerpo, cols) {
  const celda = (f, campo) => (campo in cols && cols[campo] !== '' ? txt(f[cols[campo]]) : '')
  const registros = []
  for (const f of cuerpo) {
    const nombre = celda(f, 'nombre')
    if (!nombre) continue
    registros.push({
      cct: celda(f, 'cct').toUpperCase() || null, nombre, nivel: celda(f, 'nivel') || null, control: celda(f, 'control') || null,
      turno: celda(f, 'turno').toUpperCase() || null, municipio: celda(f, 'municipio') || null,
      localidad: celda(f, 'localidad') || null, direccion: celda(f, 'direccion') || null,
    })
  }
  return registros
}

async function leerResumenEscuelas() {
  const filas = []
  for (let desde = 0; desde < 50000; desde += 1000) {
    const { data, error } = await supabase.from('snte_escuelas').select('id, asesor_id, cct, nombre, turno, municipio').range(desde, desde + 999)
    if (error) return { error }
    filas.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return { filas }
}

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

export default function SnteAdmin({ soyAdmin }) {
  const [asesores, setAsesores] = useState([])
  const [filas, setFilas] = useState([])
  const [escuelas, setEscuelas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  const [tipo, setTipo] = useState('clientes')
  const [seccionDef, setSeccionDef] = useState('')
  const [asesorSel, setAsesorSel] = useState('')
  const [secFiltro, setSecFiltro] = useState('todas')
  const [turnoFiltro, setTurnoFiltro] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [reemplazar, setReemplazar] = useState(false)
  const [pendiente, setPendiente] = useState(null) // escuelas leídas, esperando confirmación

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    const [a, r, esc] = await Promise.all([supabase.rpc('snte_lista_asesores'), leerResumen(), leerResumenEscuelas()])
    if (a.error || r.error || esc.error) setError('No se pudo leer la cartera. Verifica que tengas permiso para gestionar la cartera.')
    else { setAsesores(a.data || []); setFilas(r.filas); setEscuelas(esc.filas) }
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
  const escuelasPorAsesor = useMemo(() => {
    const m = new Map()
    escuelas.forEach((f) => { if (f.asesor_id) m.set(f.asesor_id, (m.get(f.asesor_id) || 0) + 1) })
    return m
  }, [escuelas])
  const candidatos = useMemo(() => sinAsignar.filter((f) =>
    (secFiltro === 'todas' || f.seccion === secFiltro) && (!turnoFiltro || f.turno === turnoFiltro)), [sinAsignar, secFiltro, turnoFiltro])

  async function subir(tabla, nuevos) {
    let subidos = 0
    for (let i = 0; i < nuevos.length; i += 500) {
      const lote = nuevos.slice(i, i + 500)
      const { error: ie } = await supabase.from(tabla).insert(lote)
      if (ie) { setError(`Se interrumpió la importación (se subieron ${subidos}). Revisa el archivo e intenta de nuevo.`); break }
      subidos += lote.length
    }
    return subidos
  }

  // La cartera siempre se sube a un asesor en particular (nunca una cartera general).
  async function importar(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    if (!asesorSel) { setError('Primero elige el asesor al que pertenece esta cartera.'); return }
    const asesor = asesores.find((a) => a.id === asesorSel)
    setTrabajando(true); setError(''); setMsg(''); setPendiente(null)
    try {
      const buffer = await archivo.arrayBuffer()
      if (tipo === 'escuelas') {
        // Las escuelas pasan primero por una confirmación de cómo se leyeron las columnas
        const lectura = analizarEscuelas(buffer)
        if (lectura.error) { setError(lectura.error); return }
        setPendiente({ archivo: archivo.name, ...lectura })
        return
      }
      const lectura = leerHoja(buffer, seccionDef)
      if (lectura.error) { setError(lectura.error); return }
      const registros = lectura.registros
      const clavesExistentes = new Set(filas.map((f) => (f.curp ? `c:${f.curp}` : `t:${f.telefono}|${norm(f.nombre)}`)))
      const nuevos = []
      for (const r of registros) {
        const k = r.curp ? `c:${r.curp}` : `t:${r.telefono}|${norm(r.nombre)}`
        if (clavesExistentes.has(k)) continue
        clavesExistentes.add(k)
        nuevos.push({ ...r, asesor_id: asesorSel })
      }
      const subidos = await subir('snte_cartera', nuevos)
      if (subidos) setMsg(`Se cargaron ${subidos} clientes nuevos a ${asesor?.nombre || 'el asesor'}. ${registros.length - nuevos.length} ya existían o estaban repetidos.`)
      else if (!nuevos.length) setMsg(`No hay clientes nuevos: los ${registros.length} registros del archivo ya estaban cargados.`)
      await cargar()
    } catch {
      setError('No se pudo leer el archivo. Usa un Excel (.xlsx) o CSV.')
    } finally {
      setTrabajando(false)
    }
  }

  async function confirmarEscuelas() {
    if (!pendiente) return
    if (!('nombre' in pendiente.cols) || pendiente.cols.nombre === '') { setError('Elige qué columna trae el nombre de la escuela.'); return }
    const asesor = asesores.find((a) => a.id === asesorSel)
    const registros = registrosEscuelas(pendiente.cuerpo, pendiente.cols)
    if (!registros.length) { setError('El archivo no trae escuelas con nombre.'); return }
    setTrabajando(true); setError(''); setMsg('')
    try {
      // "Reemplazar": se borran las escuelas actuales de este asesor y se cargan las del archivo
      if (reemplazar) {
        const { error: de } = await supabase.from('snte_escuelas').delete().eq('asesor_id', asesorSel)
        if (de) { setError('No se pudieron reemplazar las escuelas actuales. No se cargó nada.'); return }
      }
      const existentes = new Set(reemplazar ? [] : escuelas.map(claveEscuela))
      const nuevos = []
      for (const r of registros) {
        const k = claveEscuela(r)
        if (existentes.has(k)) continue
        existentes.add(k)
        nuevos.push({ ...r, asesor_id: asesorSel })
      }
      const subidos = await subir('snte_escuelas', nuevos)
      if (subidos) setMsg(`Se cargaron ${subidos} escuelas nuevas a ${asesor?.nombre || 'el asesor'}. ${registros.length - nuevos.length} ya existían o estaban repetidas.`)
      else if (!nuevos.length) setMsg(`No hay escuelas nuevas: las ${registros.length} del archivo ya estaban cargadas.`)
      setPendiente(null)
      await cargar()
    } finally {
      setTrabajando(false)
    }
  }

  function asignarColumna(campo, valor) {
    setPendiente((p) => {
      const cols = { ...p.cols }
      if (valor === '') delete cols[campo]
      else cols[campo] = Number(valor)
      return { ...p, cols }
    })
  }

  // Solo el administrador: borra la cartera (escuelas o contactos) de un asesor para poder cargarla de nuevo
  async function borrarCartera(a, tabla) {
    const esEsc = tabla === 'snte_escuelas'
    const n = (esEsc ? escuelasPorAsesor : porAsesor).get(a.id) || 0
    const que = esEsc ? 'escuelas' : 'clientes de la cartera'
    if (!window.confirm(`¿Eliminar las ${n} ${que} de ${a.nombre}? Esta acción no se puede deshacer.`)) return
    setError(''); setMsg(''); setTrabajando(true)
    const { error: e } = await supabase.from(tabla).delete().eq('asesor_id', a.id)
    setTrabajando(false)
    if (e) { setError('No se pudo eliminar la cartera.'); return }
    setMsg(`Se eliminaron ${n} ${que} de ${a.nombre}. Ya puedes cargar el Excel de nuevo.`)
    await cargar()
  }

  async function cambiarGestor(a) {
    setError(''); setMsg('')
    const { error: e } = await supabase.rpc('snte_set_gestor', { p_asesor: a.id, p_valor: !a.es_gestor })
    if (e) { setError('No se pudo cambiar el permiso.'); return }
    setAsesores((as) => as.map((x) => (x.id === a.id ? { ...x, es_gestor: !x.es_gestor } : x)))
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
        <b style={{ fontSize: 14 }}>Subir cartera a un asesor</b>
        <p className="snte-sub" style={{ margin: '4px 0 10px' }}>
          La cartera se sube siempre por asesor. Elige a quién pertenece, el tipo de cartera y el archivo.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          <label className="snte-label" htmlFor="snte-asesor" style={{ marginBottom: 0 }}>1. Asesor</label>
          <select id="snte-asesor" className="snte-select" value={asesorSel} onChange={(e) => { setAsesorSel(e.target.value); setPendiente(null) }}>
            <option value="">Elegir asesor</option>
            {asesores.filter((a) => a.activo).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>

          <span className="snte-label" style={{ marginBottom: 0 }}>2. Tipo de cartera</span>
          <div style={{ display: 'flex', gap: 6 }} role="group" aria-label="Tipo de cartera">
            {[['clientes', 'Clientes'], ['escuelas', 'Escuelas']].map(([id, label]) => (
              <button key={id} type="button" className={'snte-chip' + (tipo === id ? ' on' : '')} aria-pressed={tipo === id} onClick={() => { setTipo(id); setPendiente(null) }}>{label}</button>
            ))}
          </div>

          {tipo === 'clientes' ? (
            <>
              <p className="snte-sub">Columnas que reconoce: nombre, CURP, sección, turno, teléfono, puesto, ciudad (cd), escuela y resultado. No duplica contactos ya cargados.</p>
              <label className="snte-label" htmlFor="snte-sec-def" style={{ marginBottom: 0 }}>Sección para filas que no la traen</label>
              <select id="snte-sec-def" className="snte-select" value={seccionDef} onChange={(e) => setSeccionDef(e.target.value)}>
                <option value="">Dejar sin sección</option>
                <option value="23">Sección 23</option>
                <option value="51">Sección 51</option>
              </select>
            </>
          ) : (
            <>
              <p className="snte-sub">Sube cualquier Excel o CSV: toma solo CCT, Nombre, Turno, Municipio, Localidad, Dirección, Nivel y Subcontrol, e ignora el resto. Antes de subir te muestra cómo leyó las columnas para que lo confirmes. No duplica escuelas ya cargadas (mismo CCT y turno).</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={reemplazar} onChange={(e) => setReemplazar(e.target.checked)} style={{ width: 16, height: 16 }} />
                Reemplazar las escuelas que ya tiene este asesor{asesorSel ? ` (${escuelasPorAsesor.get(asesorSel) || 0})` : ''}
              </label>
            </>
          )}

          <span className="snte-label" style={{ marginBottom: 0 }}>3. Archivo</span>
          <label className="snte-btn" style={{ cursor: trabajando || !asesorSel ? 'default' : 'pointer', opacity: trabajando || !asesorSel ? 0.55 : 1 }}>
            {trabajando ? 'Trabajando…' : `Subir Excel o CSV de ${tipo === 'escuelas' ? 'escuelas' : 'clientes'}`}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={importar} disabled={trabajando || !asesorSel} style={{ display: 'none' }} />
          </label>
          {!asesorSel && <p className="snte-sub">Elige primero al asesor para habilitar el botón.</p>}

          {pendiente && (
            <div className="snte-card" style={{ background: 'var(--snte-wash)', marginTop: 4 }}>
              <b style={{ fontSize: 14 }}>Revisa cómo leí “{pendiente.archivo}”</b>
              <p className="snte-sub" style={{ margin: '4px 0 10px' }}>
                {pendiente.cuerpo.length} filas · hoja “{pendiente.hoja}”. Las columnas que no elijas aquí se ignoran. Corrige lo que no esté bien.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {CAMPOS_ESC.map(([campo, etiqueta]) => (
                  <div key={campo} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 8 }}>
                    <span className="snte-label" style={{ marginBottom: 0 }}>{etiqueta}{campo === 'nombre' ? ' *' : ''}</span>
                    <select className="snte-select" aria-label={etiqueta} value={campo in pendiente.cols ? pendiente.cols[campo] : ''} onChange={(e) => asignarColumna(campo, e.target.value)}>
                      <option value="">— No viene en el archivo —</option>
                      {pendiente.encabezados.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <p className="snte-sub" style={{ margin: '10px 0 4px', fontWeight: 600 }}>Así quedarían las primeras filas:</p>
              {registrosEscuelas(pendiente.cuerpo.slice(0, 3), pendiente.cols).map((r, i) => (
                <div key={i} className="snte-fila" style={{ padding: '6px 0', fontSize: 12.5 }}>
                  <b>{r.nombre}</b>
                  <div className="snte-sub">{[r.cct, r.turno, r.nivel, r.control, r.municipio, r.localidad].filter(Boolean).join(' · ') || 'Sin más datos'}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="snte-btn" style={{ flex: 1 }} disabled={trabajando} onClick={confirmarEscuelas}>{trabajando ? 'Subiendo…' : 'Confirmar y subir'}</button>
                <button type="button" className="snte-btn sec" disabled={trabajando} onClick={() => setPendiente(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {sinAsignar.length > 0 && (
        <div className="snte-card" style={{ marginTop: 12 }}>
          <b style={{ fontSize: 14 }}>Clientes sin asignar ({sinAsignar.length})</b>
          <p className="snte-sub" style={{ margin: '4px 0 10px' }}>Contactos cargados antes de este cambio. Se asignan al asesor elegido arriba.</p>
          <div style={{ display: 'grid', gap: 8 }}>
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
            <button className="snte-btn" onClick={asignar} disabled={trabajando || cargando}>Asignar al asesor elegido</button>
          </div>
        </div>
      )}

      <div className="snte-card" style={{ marginTop: 12 }}>
        <b style={{ fontSize: 14 }}>Cartera por asesor</b>
        {asesores.map((a) => (
          <div className="snte-fila" key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.nombre}</div>
              <div className="snte-sub" style={{ fontSize: 12 }}>{a.vinculado ? 'Ya entró al espacio' : 'Aún no ha entrado'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {a.es_gestor && <span className="snte-pill ok">Gestor</span>}
              {soyAdmin && (
                <button type="button" className="snte-btn sec chico" onClick={() => cambiarGestor(a)}>
                  {a.es_gestor ? 'Quitar gestor' : 'Hacer gestor'}
                </button>
              )}
              <span className="snte-pill">{porAsesor.get(a.id) || 0} clientes</span>
              <span className="snte-pill">{escuelasPorAsesor.get(a.id) || 0} escuelas</span>
            </div>
            {soyAdmin && ((escuelasPorAsesor.get(a.id) || 0) > 0 || (porAsesor.get(a.id) || 0) > 0) && (
              <div style={{ display: 'flex', gap: 6, flexBasis: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {(escuelasPorAsesor.get(a.id) || 0) > 0 && (
                  <button type="button" className="snte-btn sec chico" style={{ color: '#A12B1D' }} disabled={trabajando} onClick={() => borrarCartera(a, 'snte_escuelas')}>Eliminar escuelas</button>
                )}
                {(porAsesor.get(a.id) || 0) > 0 && (
                  <button type="button" className="snte-btn sec chico" style={{ color: '#A12B1D' }} disabled={trabajando} onClick={() => borrarCartera(a, 'snte_cartera')}>Eliminar clientes</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
