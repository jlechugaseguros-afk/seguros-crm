import React, { useEffect, useState, useCallback } from 'react'
import { UserPlus, RefreshCw, Copy, Check, KeyRound, Ban, RotateCcw, Send } from 'lucide-react'
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

export default function Administracion({ miId }) {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [creando, setCreando] = useState(false)
  const [credencial, setCredencial] = useState(null) // { correo, clave, nuevo }
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState('') // id con acción en curso

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
    setCreando(true)
    const r = await llamar({ accion: 'crear', correo, nombre })
    setCreando(false)
    if (!r.ok) return setError(ERRORES[r.error] || `No se pudo crear el usuario. ${r.detalle || ''}`)
    setCredencial({ correo: r.correo, clave: r.clave, nuevo: true })
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
        </form>

        {credencial && (
          <div style={{
            marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--gold-soft)', border: '1px solid var(--gold)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
              {credencial.nuevo ? 'Usuario creado' : 'Nueva contraseña temporal'} para <b>{credencial.correo}</b>
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
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', overflowWrap: 'anywhere' }}>
                      {u.nombre || u.correo}
                      {soyYo && <span style={{ fontWeight: 500, color: 'var(--gold-text)' }}> · tú</span>}
                    </div>
                    {u.nombre && <div style={{ fontSize: 12.5, color: 'var(--stone)', overflowWrap: 'anywhere' }}>{u.correo}</div>}
                    <div style={{ fontSize: 11.5, color: 'var(--stone)', marginTop: 2 }}>
                      Último acceso: {fechaCorta(u.ultimo_acceso)}{u.google ? ' · Google' : ''}
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
