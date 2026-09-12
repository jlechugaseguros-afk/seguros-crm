import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import { MC_LOGO, JL_LOGO } from './brandAssets.js'


export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)
  const [mode, setMode] = useState('signin') // signin | signup | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) setError(error.message)
      else setNotice('Te enviamos un correo con un enlace para crear una nueva contraseña.')
      return
    }

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setNotice('Cuenta creada. Revisa tu correo para confirmarla antes de entrar.')
    }
  }

  async function handleGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  if (session === undefined) {
    return <div className="min-h-dvh" style={{ background: 'var(--cream)' }} />
  }

  if (!session) {
    return (
      <div className="min-h-dvh" style={{
        fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--cream)',
        display: 'flex', flexDirection: 'column',
      }}>
        <style>{`
          @keyframes ringDraw { to { stroke-dashoffset: 0; } }
          .auth-ring {
            fill: none; stroke: #EFE9D8; stroke-width: 1.1; opacity: .55;
            stroke-dasharray: 600; stroke-dashoffset: 600;
            animation: ringDraw 2.4s ease-out forwards;
          }
          .auth-ring.r2 { animation-delay: .22s; opacity: .38; }
          .auth-ring.r3 { animation-delay: .44s; opacity: .24; }
          .auth-split { display: grid; grid-template-columns: 1fr 1.15fr; flex: 1; min-height: 0; }
          @media (max-width: 720px) {
            .auth-split { grid-template-columns: 1fr; }
            .auth-art { display: none; }
          }
        `}</style>

        {/* Franja superior discreta con ambos logos */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
          padding: '14px 20px', borderBottom: '1px solid var(--line)', background: '#FFFFFF',
        }}>
          <img src={MC_LOGO} alt="MCBrokers" style={{ height: 26, objectFit: 'contain' }} />
          <div style={{ width: 1, height: 22, background: 'var(--line)' }} />
          <img src={JL_LOGO} alt="Consultoría Patrimonial" style={{ height: 34, objectFit: 'contain' }} />
        </div>

        <div className="auth-split">
          {/* Panel de arte — oculto en celular */}
          <div className="auth-art" style={{
            background: 'radial-gradient(120% 120% at 20% 15%, var(--ink-2), var(--ink) 60%)',
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: 32, color: '#EFE9D8',
          }}>
            <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <circle className="auth-ring" cx="150" cy="180" r="90" />
              <circle className="auth-ring r2" cx="150" cy="180" r="120" />
              <circle className="auth-ring r3" cx="150" cy="180" r="150" />
            </svg>
            <div style={{ position: 'relative', zIndex: 2, fontSize: 15 }}>
              <b style={{ fontWeight: 600 }}>MCBrokers</b> · seguros-crm
            </div>
            <div style={{ position: 'relative', zIndex: 2, maxWidth: 280, fontSize: 14, lineHeight: 1.5, color: '#DCE7E1' }}>
              Tu cartera de clientes, pólizas y comisiones en un solo lugar.
            </div>
          </div>

          {/* Panel del formulario */}
          <div style={{ padding: '44px 46px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
              <h1 className="serif" style={{ fontSize: 26, fontWeight: 500, marginBottom: 6, color: 'var(--ink)' }}>
                {mode === 'signin' && 'Bienvenido de vuelta'}
                {mode === 'signup' && 'Crear cuenta'}
                {mode === 'reset' && 'Recuperar contraseña'}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 24 }}>
                {mode === 'signin' && 'Inicia sesión para continuar'}
                {mode === 'signup' && 'Regístrate para empezar'}
                {mode === 'reset' && 'Te enviaremos un enlace a tu correo'}
              </p>
              {error && <p style={{ color: '#B23A2E', fontSize: 13, marginBottom: 12 }}>{error}</p>}
              {notice && <p style={{ color: 'var(--emerald)', fontSize: 13, marginBottom: 12 }}>{notice}</p>}

              <button
                type="button"
                onClick={handleGoogle}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 7, padding: 12,
                  fontWeight: 600, marginBottom: 16, color: 'var(--ink)', fontFamily: 'inherit', fontSize: 14,
                }}
              >
                Continuar con Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px', fontSize: 12, color: 'var(--stone)' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                o con correo
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>

              <input
                type="email" placeholder="Correo electrónico" value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: 11, marginBottom: 10, border: '1px solid var(--line)', borderRadius: 7,
                  fontFamily: 'inherit', fontSize: 14, background: 'var(--cream)',
                }}
              />

              {mode !== 'reset' && (
                <input
                  type="password" placeholder="Contraseña" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: 11, marginBottom: 16, border: '1px solid var(--line)', borderRadius: 7,
                    fontFamily: 'inherit', fontSize: 14, background: 'var(--cream)',
                  }}
                />
              )}

              <button type="submit" style={{
                width: '100%', background: 'var(--ink)', color: 'var(--cream)', border: 'none',
                borderRadius: 7, padding: 12, fontWeight: 600, marginBottom: 10, fontFamily: 'inherit', fontSize: 14,
              }}>
                {mode === 'signin' && 'Entrar'}
                {mode === 'signup' && 'Registrarme'}
                {mode === 'reset' && 'Enviar enlace de recuperación'}
              </button>

              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setNotice('') }}
                  style={{ width: '100%', background: 'none', border: 'none', color: '#5B5646', fontSize: 13, marginBottom: 6, fontFamily: 'inherit' }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}

              <button
                type="button"
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}
                style={{ width: '100%', background: 'none', border: 'none', color: '#5B5646', fontSize: 13, fontFamily: 'inherit' }}
              >
                {mode === 'signin' ? '¿No tienes cuenta? Créala' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </form>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#B0AB9A', padding: '10px 20px' }}>
          Creado por Joshua Lechuga en colaboración con Claude, todos los derechos reservados
        </p>
      </div>
    )
  }

  return children
}
