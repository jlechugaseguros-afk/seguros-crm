import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'

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
    return <div className="min-h-dvh" style={{ background: '#F7F5F0' }} />
  }

  if (!session) {
    return (
      <div className="min-h-dvh" style={{
        fontFamily: "'Inter', system-ui, sans-serif", background: '#F7F5F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: '#1B2A41' }}>
            {mode === 'signin' && 'Iniciar sesión'}
            {mode === 'signup' && 'Crear cuenta'}
            {mode === 'reset' && 'Recuperar contraseña'}
          </h1>
          {error && <p style={{ color: '#B23A2E', fontSize: 13 }}>{error}</p>}
          {notice && <p style={{ color: '#3E6259', fontSize: 13 }}>{notice}</p>}

          <button
            type="button"
            onClick={handleGoogle}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#FFFFFF', border: '1px solid #DAD5C7', borderRadius: 6, padding: 12,
              fontWeight: 600, marginBottom: 16, color: '#1B2A41',
            }}
          >
            Continuar con Google
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: '#8A8574', marginBottom: 16 }}>o con correo</div>

          <input
            type="email" placeholder="Correo electrónico" value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 12, marginBottom: 10, border: '1px solid #DAD5C7', borderRadius: 6 }}
          />

          {mode !== 'reset' && (
            <input
              type="password" placeholder="Contraseña" value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: 12, marginBottom: 16, border: '1px solid #DAD5C7', borderRadius: 6 }}
            />
          )}

          <button type="submit" style={{
            width: '100%', background: '#1B2A41', color: '#F7F5F0', border: 'none',
            borderRadius: 6, padding: 12, fontWeight: 600, marginBottom: 10,
          }}>
            {mode === 'signin' && 'Entrar'}
            {mode === 'signup' && 'Registrarme'}
            {mode === 'reset' && 'Enviar enlace de recuperación'}
          </button>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => { setMode('reset'); setError(''); setNotice('') }}
              style={{ width: '100%', background: 'none', border: 'none', color: '#5B5646', fontSize: 13, marginBottom: 6 }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}
            style={{ width: '100%', background: 'none', border: 'none', color: '#5B5646', fontSize: 13 }}
          >
            {mode === 'signin' ? '¿No tienes cuenta? Créala' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 10, color: '#B0AB9A', marginTop: 20 }}>
          Creado por Joshua Lechuga en colaboración con Claude, todos los derechos reservados
        </p>
      </div>
    )
  }

  return children
}