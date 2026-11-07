import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { UserPlus, RefreshCw, Copy, Check, KeyRound, Ban, RotateCcw, Send, SlidersHorizontal } from 'lucide-react'
import { supabase } from './supabaseClient.js'
import PageHeader from './PageHeader.jsx'

// Panel del administrador: alta de agentes con contraseña temporal de 6 dígitos,
// restablecer contraseña y suspender / reactivar el acceso.

const fechaCorta = (iso) => {
  if (!iso) return 'Nunca'
  try {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

const ERRORES = {
  correo_invalido: 'El correo no es válido.',
  correo_existe: 'Ya existe un usuario con ese correo. Búscalo en la lista y usa "Restablecer clave".',
  permiso: 'No tienes permiso de administrador.',
  sesion: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  tu_cuenta: 'No puedes hacer esto sobre tu propia cuenta.',
  es_cliente: 'Esa cuenta es de un cliente del portal, no de un agente.',
  accesos_invalidos: 'Marca al menos una pestaña.',
}

async function llamar(body) {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', { body })
  // Cuando la función responde con error HTTP, el detalle viene en error.context
  if (error) {
    let d = data
    try { d = await error.context?.json?.() } catch { /* sin detalle */ }
    return { ok: false, error: d?.error || 'error', detalle: d?.detalle }
  }
  return data?.error ? { ok: false, error: data.error, detalle: data.detalle } : { ok: true, ...data }
}

// ---- Accesos por pestaña ----
// Cada usuario tiene una lista de pestañas visibles (null = todas) y una letra distintiva de perfil:
// "A" = acceso completo; las demás letras (B, C…) identifican cada combinación distinta de accesos.
const COLORES_LETRA = ['#2F7D5B', '#2B5C8A', '#8A5A2B', '#7A3E8E', '#B23A2E', '#2A7F86', '#8A7A1F', '#555F6B']
const colorLetra = (l) => (l === 'A' ? COLORES_LETRA[0] : COLORES_LETRA[1 + ((l.charCodeAt(0) - 66) % (COLORES_LETRA.length - 1))])
const clave = (ids) => [...ids].sort().join('|')

// Letra para un conjunto de pestañas: A si es todo; si otro usuario ya tiene el mismo conjunto, su letra; si no, la siguiente libre.
function letraPara(seleccion, todas, otros) {
  if (seleccion.length === todas.length) return 'A'
  const k = clave(seleccion)
  const igual = otros.find((u) => u.perfil_letra && u.perfil_letra !== 'A' && u.pestanas_permitidas && clave(u.pestanas_permitidas) === k)
  if (igual) return igual.perfil_letra
  const usadas = new Set(otros.map((u) => u.perfil_letra).filter(Boolean))
  for (let c = 66; c <= 90; c++) {
    const l = String.fromCharCode(c)
    if (!usadas.has(l)) return l
  }
  return 'Z'
}

function ChecklistAccesos({ grupos, valor, onChange }) {
  const total = grupos.reduce((n, g) => n + g.items.length, 0)
  const set = new Set(valor)
  const alternar = (id) => onChange(set.has(id) ? valor.filter((x) => x !== id) : [...valor, id])
  const alternarGrupo = (g) => {
    const ids = g.items.map((i) => i.id)
    const todos = ids.every((id) => set.has(id))
    onChange(todos ? valor.filter((x) => !ids.includes(x)) : [...new Set([...valor, ...ids])])
  }
  const chico = { fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 7, border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)' }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Verá {valor.length} de {total} pestañas</span>
        <button type="button" style={chico} onClick={() => onChange(grupos.flatMap((g) => g.items.map((i) => i.id)))}>Marcar todo</button>
        <button type="button" style={chico} onClick={() => onChange([])}>Quitar todo</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
        {grupos.map((g) => {
          const ids = g.items.map((i) => i.id)
          const n = ids.filter((id) => set.has(id)).length
          return (
            <fieldset key={g.titulo} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px 10px', margin: 0, background: '#fff' }}>
              <legend style={{ padding: '0 6px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={n === ids.length} ref={(el) => { if (el) el.indeterminate = n > 0 && n < ids.length }}
                    onChange={() => alternarGrupo(g)} />
                  {g.titulo} <span style={{ fontWeight: 500, color: 'var(--stone)' }}>{n}/{ids.length}</span>
                </label>
              </legend>
              {g.items.map((i) => (
                <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, padding: '4px 0', cursor: 'pointer', color: 'var(--ink)' }}>
                  <input type="checkbox" checked={set.has(i.id)} onChange={() => alternar(i.id)} />
                  {i.label}
                </label>
              ))}
            </fieldset>
          )
        })}
      </div>
    </div>
  )
}

function InsigniaLetra({ letra, titulo, size = 34 }) {
  const especial = letra === '★' || letra === '—'
  return (
    <span title={titulo} aria-label={titulo} style={{
      width: size, height: size, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
      fontWeight: 800, fontSize: size * 0.48, color: '#fff', background: letra === '★' ? 'var(--ink)' : letra === '—' ? '#9AA3AD' : colorLetra(letra),
      ...(especial ? {} : {}),
    }}>{letra}</span>
  )
}

export default function Administracion({ miId, pestanas = [] }) {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [creando, setCreando] = useState(false)
  const [credencial, setCredencial] = useState(null) // { correo, clave, nuevo }
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState('') // id con acción en curso
  const todasIds = useMemo(() => pestanas.flatMap((g) => g.items.map((i) => i.id)), [pestanas])
  const etiquetas = useMemo(() => Object.fromEntries(pestanas.flatMap((g) => g.items.map((i) => [i.id, i.label]))), [pestanas])
  const [accesosNuevo, setAccesosNuevo] = useState(null) // null = todas marcadas (valor inicial)
  const seleccionNueva = accesosNuevo ?? todasIds
  const [editando, setEditando] = useState(null) // { id, valor }
  const [guardandoAcc, setGuardandoAcc] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    const r = await llamar({ accion: 'listar' })
    if (!r.ok) setError(ERRORES[r.error] || 'No se pudo cargar la lista de usuarios.')
    else setUsuarios(r.usuarios || [])
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function crear(e) {
    e.preventDefault()
    setError('')
    setCredencial(null)
    if (seleccionNueva.length === 0) return setError('Marca al menos una pestaña para el nuevo usuario.')
    setCreando(true)
    const completo = seleccionNueva.length === todasIds.length
    const letra = letraPara(seleccionNueva, todasIds, usuarios.filter((u) => u.rol !== 'admin'))
    const r = await llamar({ accion: 'crear', correo, nombre, pestanas: completo ? null : seleccionNueva, letra })
    setCreando(false)
    if (!r.ok) return setError(ERRORES[r.error] || `No se pudo crear el usuario. ${r.detalle || ''}`)
    setCredencial({ correo: r.correo, clave: r.clave, nuevo: true, letra })
    setAccesosNuevo(null)
    setNombre('')
    setCorreo('')
    cargar()
  }

  async function restablecer(u) {
    if (!window.confirm(`¿Generar una nueva contraseña temporal para ${u.correo}? La actual dejará de funcionar y tendrá que crear una nueva al entrar.`)) return
    setOcupado(u.id)
    setError('')
    setCredencial(null)
    const r = await llamar({ accion: 'restablecer', id: u.id })
    setOcupado('')
    if (!r.ok) return setError(ERRORES[r.error] || `No se pudo restablecer. ${r.detalle || ''}`)
    setCredencial({ correo: r.correo, clave: r.clave, nuevo: false })
    cargar()
  }

  async function guardarAccesos(u) {
    const valor = editando.valor
    if (valor.length === 0) return setError('Marca al menos una pestaña.')
    setError('')
    setGuardandoAcc(true)
    const completo = valor.length === todasIds.length
    const letra = letraPara(valor, todasIds, usuarios.filter((x) => x.id !== u.id && x.rol !== 'admin'))
    const r = await llamar({ accion: 'permisos', id: u.id, pestanas: completo ? null : valor, letra })
    setGuardandoAcc(false)
    if (!r.ok) return setError(ERRORES[r.error] || `No se pudieron guardar los accesos. ${r.detalle || ''}`)
    setEditando(null)
    cargar()
  }

  async function cambiarEstado(u, accion) {
    const texto = accion === 'suspender'
      ? `¿Suspender el acceso de ${u.correo}? No podrá entrar al CRM hasta que lo reactives (sus datos se conservan).`
      : `¿Reactivar el acceso de ${u.correo}?`
    if (!window.confirm(texto)) return
    setOcupado(u.id)
    setError('')
    const r = await llamar({ accion, id: u.id })
    setOcupado('')
    if (!r.ok) return setError(ERRORES[r.error] || `No se pudo completar la acción. ${r.detalle || ''}`)
    cargar()
  }

  const mensajeWhatsApp = credencial
    ? `Hola, te di de alta en J L CRM.\nEntra en ${window.location.origin} con tu correo ${credencial.correo} y la contraseña temporal ${credencial.clave}.\nAl entrar te pedirá crear tu contraseña personal.`
    : ''

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensajeWhatsApp)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* sin permiso de portapapeles */ }
  }

  const letraDe = (u) => (u.rol === 'admin' ? '★' : u.rol === 'demo' ? '—' : u.perfil_letra || (u.pestanas_permitidas ? '?' : 'A'))
  const idsDe = (u) => (Array.isArray(u.pestanas_permitidas) && u.pestanas_permitidas.length ? u.pestanas_permitidas : todasIds)
  const perfilesEnUso = useMemo(() => {
    const mapa = new Map()
    usuarios.filter((u) => u.rol === 'agente').forEach((u) => {
      const l = letraDe(u)
      if (!mapa.has(l)) mapa.set(l, { letra: l, ids: idsDe(u), usuarios: 0 })
      mapa.get(l).usuarios += 1
    })
    return [...mapa.values()].sort((a, b) => a.letra.localeCompare(b.letra))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarios, todasIds])
  const activos = usuarios.filter((u) => u.activo && u.rol !== 'demo').length
  const campo = {
    flex: '1 1 200px', padding: 11, border: '1px solid var(--line)', borderRadius: 7,
    fontFamily: 'inherit', fontSize: 14, background: 'var(--cream)',
  }
  const botonChico = {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, fontSize: 12.5,
    fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)',
  }

  return (
    <div>
      <PageHeader
        eyebrow="Solo administrador"
        title="Administración"
        subtitle="Da de alta a tus agentes con una contraseña temporal de 6 dígitos, restablécela o suspende el acceso."
      />

      <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={17} /> Nuevo agente
        </h3>
        <form onSubmit={crear} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={campo} placeholder="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input style={campo} type="email" required placeholder="Correo del agente" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          <button type="submit" disabled={creando} style={{
            background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: 7, padding: '11px 18px',
            fontWeight: 600, fontFamily: 'inherit', fontSize: 14, opacity: creando ? 0.6 : 1,
          }}>
            {creando ? 'Creando…' : 'Crear usuario'}
          </button>
          <div style={{ flex: '1 1 100%' }}>
            <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '4px 0 8px', color: 'var(--ink)' }}>
              ¿Qué pestañas podrá ver?{' '}
              <span style={{ fontWeight: 500, color: 'var(--stone)' }}>
                · Perfil <b>{letraPara(seleccionNueva, todasIds, usuarios.filter((u) => u.rol !== 'admin'))}</b>
              </span>
            </h4>
            <ChecklistAccesos grupos={pestanas} valor={seleccionNueva} onChange={setAccesosNuevo} />
          </div>
        </form>

        {credencial && (
          <div style={{
            marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--gold-soft)', border: '1px solid var(--gold)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
              {credencial.nuevo ? 'Usuario creado' : 'Nueva contraseña temporal'} para <b>{credencial.correo}</b>
              {credencial.nuevo && credencial.letra && <> · perfil <b>{credencial.letra}</b></>}
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 8, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {credencial.clave}
            </div>
            <div style={{ fontSize: 12, color: 'var(--stone)', margin: '6px 0 12px' }}>
              Anótala o envíala ahora: por seguridad no se vuelve a mostrar. Al entrar, el agente deberá crear su contraseña personal.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={copiar} style={botonChico}>
                {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? 'Copiado' : 'Copiar mensaje'}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`} target="_blank" rel="noreferrer"
                style={{ ...botonChico, textDecoration: 'none' }}>
                <Send size={14} /> Enviar por WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: '#B23A2E', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {perfilesEnUso.length > 0 && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>Perfiles de acceso</h3>
          <p style={{ fontSize: 12.5, color: 'var(--stone)', margin: '0 0 12px' }}>La letra al inicio de cada usuario indica qué ve y qué no.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {perfilesEnUso.map((pf) => {
              const ve = pf.ids.filter((id) => etiquetas[id])
              const noVe = todasIds.filter((id) => !pf.ids.includes(id))
              return (
                <div key={pf.letra} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <InsigniaLetra letra={pf.letra} titulo={`Perfil ${pf.letra}`} />
                  <div style={{ minWidth: 0, fontSize: 12.5, lineHeight: 1.6 }}>
                    <div><b style={{ color: '#2F7D5B' }}>Ve:</b> {noVe.length === 0 ? 'Todo' : ve.map((id) => etiquetas[id]).join(', ')}</div>
                    {noVe.length > 0 && <div><b style={{ color: '#B23A2E' }}>No ve:</b> <span style={{ color: 'var(--stone)' }}>{noVe.map((id) => etiquetas[id]).join(', ')}</span></div>}
                    <div style={{ color: 'var(--stone)' }}>{pf.usuarios} usuario{pf.usuarios === 1 ? '' : 's'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            Usuarios <span style={{ fontWeight: 500, color: 'var(--stone)', fontSize: 13 }}>· {activos} activos</span>
          </h3>
          <button type="button" onClick={cargar} disabled={cargando} style={botonChico}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {cargando && !usuarios.length ? (
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Cargando…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {usuarios.map((u) => {
              const soyYo = u.id === miId
              const demo = u.rol === 'demo'
              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--line)', background: u.activo ? '#fff' : '#F6EDED', opacity: ocupado === u.id ? 0.6 : 1,
                }}>
                  <InsigniaLetra
                    letra={letraDe(u)}
                    titulo={u.rol === 'admin' ? 'Administrador: ve todo' : demo ? 'Cuenta demo' : `Perfil ${letraDe(u)}: ve ${idsDe(u).length} de ${todasIds.length} pestañas`}
                  />
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', overflowWrap: 'anywhere' }}>
                      {u.nombre || u.correo}
                      {soyYo && <span style={{ fontWeight: 500, color: 'var(--gold-text)' }}> · tú</span>}
                    </div>
                    {u.nombre && <div style={{ fontSize: 12.5, color: 'var(--stone)', overflowWrap: 'anywhere' }}>{u.correo}</div>}
                    <div style={{ fontSize: 11.5, color: 'var(--stone)', marginTop: 2 }}>
                      Último acceso: {fechaCorta(u.ultimo_acceso)}{u.google ? ' · Google' : ''}
                      {u.rol === 'agente' && ` · Ve ${idsDe(u).length} de ${todasIds.length} pestañas`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {u.rol === 'admin' && <Etiqueta color="var(--ink)" fondo="var(--gold-soft)">Administrador</Etiqueta>}
                    {demo && <Etiqueta color="var(--stone)" fondo="var(--cream-2)">Demo</Etiqueta>}
                    {!u.activo && <Etiqueta color="#B23A2E" fondo="#F8E1DE">Suspendido</Etiqueta>}
                    {u.activo && u.debe_cambiar_clave && <Etiqueta color="var(--gold-text)" fondo="var(--gold-soft)">Clave temporal pendiente</Etiqueta>}
                    {u.activo && !u.debe_cambiar_clave && u.rol === 'agente' && <Etiqueta color="var(--emerald)" fondo="#E2EFEA">Activo</Etiqueta>}
                  </div>
                  {!soyYo && !demo && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" style={botonChico} disabled={!!ocupado}
                        onClick={() => setEditando(editando && editando.id === u.id ? null : { id: u.id, valor: idsDe(u) })}>
                        <SlidersHorizontal size={13} /> Accesos
                      </button>
                      <button type="button" style={botonChico} disabled={!!ocupado} onClick={() => restablecer(u)}>
                        <KeyRound size={13} /> Restablecer clave
                      </button>
                      {u.activo ? (
                        <button type="button" style={{ ...botonChico, color: '#B23A2E' }} disabled={!!ocupado} onClick={() => cambiarEstado(u, 'suspender')}>
                          <Ban size={13} /> Suspender
                        </button>
                      ) : (
                        <button type="button" style={botonChico} disabled={!!ocupado} onClick={() => cambiarEstado(u, 'reactivar')}>
                          <RotateCcw size={13} /> Reactivar
                        </button>
                      )}
                    </div>
                  )}
                  {editando && editando.id === u.id && (
                    <div style={{ flex: '1 1 100%', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                      <ChecklistAccesos grupos={pestanas} valor={editando.valor} onChange={(valor) => setEditando({ id: u.id, valor })} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button type="button" disabled={guardandoAcc} onClick={() => guardarAccesos(u)} style={{
                          background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: 7, padding: '9px 16px',
                          fontWeight: 600, fontFamily: 'inherit', fontSize: 13.5, opacity: guardandoAcc ? 0.6 : 1, cursor: 'pointer',
                        }}>{guardandoAcc ? 'Guardando…' : 'Guardar accesos'}</button>
                        <button type="button" style={botonChico} onClick={() => setEditando(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {!usuarios.length && !cargando && <p style={{ fontSize: 13, color: 'var(--stone)' }}>Aún no hay usuarios.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function Etiqueta({ children, color, fondo }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 20, color, background: fondo, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}
