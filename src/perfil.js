import { createContext, useContext } from 'react'

// Perfil del usuario que inició sesión (rol, estado y si debe cambiar su contraseña temporal).
// Lo carga AuthGate desde la tabla "perfiles" y lo reparte a toda la app.
export const PerfilContext = createContext(null)

export function usePerfil() {
  return useContext(PerfilContext)
}

export const esAdmin = (perfil) => perfil?.rol === 'admin' && perfil?.activo !== false
