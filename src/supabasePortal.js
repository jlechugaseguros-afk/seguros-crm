import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase EXCLUSIVO del portal de clientes.
// Guarda su sesión con una llave propia, así que es independiente de la sesión del CRM:
// un agente puede tener el CRM abierto y, en el mismo navegador, entrar al portal como cliente.
const supabaseUrl = 'https://sudtvcecdnkbpzzvddfu.supabase.co'
const supabaseKey = 'sb_publishable_ANJ_BkkcnLU8EEq3pqlVRQ_51_xZKz3'

export const supabasePortal = createClient(supabaseUrl, supabaseKey, {
  auth: { storageKey: 'jl-portal-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
