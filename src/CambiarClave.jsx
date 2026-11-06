import React, { useState } from 'react'
import { supabase } from './supabaseClient.js'
import { JL_LOGO } from './brandAssets.js'

// Pantalla obligatoria al primer ingreso: el agente cambia su contraseña temporal
// (6 dígitos que le dio el administrador) por una personal.
export default function CambiarClave({ correo, onListo, onSalir }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (p1.length < 8) return setError('Tu contraseña debe tener al menos 8 caracteres.')
    if (/^\d+$/.test(p1)) return setError('Incluye al menos una letra; una contraseña solo de números es fácil de adivinar.')
    if (p1 !== p2) return setError('Las contraseñas no coinciden.')
    setGuardando(true)
    const { error: err } = await supabase.auth.updateUser({ password: p1 })
    if (err) {
      setGuardando(false)
      return setError(
        /different|same/i.test(err.message)
          ? 'La nueva contraseña debe ser distinta a la temporal.'
          : 'No se pudo guardar la contraseña: ' + err.message
      )
    }
    // Avisa al sistema que ya no debe pedirla de nuevo
    try { await supabase.functions.invoke('admin-usuarios', { body: { accion: 'clave_cambiada' } }) } catch { /* se reintenta en el siguiente ingreso */ }
    setGuardando(false)
    onListo()
  }

  const campo = {
    width: '100%', padding: 11, marginBottom: 10, border: '1px solid var(--line)', borderRadius: 7,
    fontFamily: 'inherit', fontSize: 14, background: 'var(--cream)',
  }

  return (
    <div className="min-h-dvh" style={{
      fontFamily: "'Manrope', system-ui, sans-serif", background: 'var(--cream)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <img src={JL_LOGO} alt="J L Consultoría Patrimonial" style={{ height: 64, objectFit: 'contain', marginBottom: 18 }} />
      <form onSubmit={guardar} style={{ width: '100%', maxWidth: 380 }}>
        <h1 className="serif" style={{ fontSize: 24, fontWeight: 500, marginBottom: 6, color: 'var(--ink)' }}>
          Crea tu contraseña personal
        </h1>
        <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.5 }}>
          Entraste con una contraseña temporal{correo ? <> para <b>{correo}</b></> : null}. Elige una contraseña propia para continuar.
        </p>
        {error && <p style={{ color: '#B23A2E', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <input
          type={ver ? 'text' : 'password'} placeholder="Nueva contraseña (mínimo 8, con letras)" value={p1}
          onChange={(e) => setP1(e.target.value)} autoComplete="new-password" style={campo}
        />
        <input
          type={ver ? 'text' : 'password'} placeholder="Repite la contraseña" value={p2}
          onChange={(e) => setP2(e.target.value)} autoComplete="new-password" style={campo}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--stone)', marginBottom: 16 }}>
          <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseña
        </label>
        <button type="submit" disabled={guardando} style={{
          width: '100%', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: 7,
          padding: 12, fontWeight: 600, marginBottom: 10, fontFamily: 'inherit', fontSize: 14, opacity: guardando ? 0.6 : 1,
        }}>
          {guardando ? 'Guardando…' : 'Guardar y entrar'}
        </button>
        <button type="button" onClick={onSalir} style={{
          width: '100%', background: 'none', border: 'none', color: '#5B5646', fontSize: 13, fontFamily: 'inherit',
        }}>
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
