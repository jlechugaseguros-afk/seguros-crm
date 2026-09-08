import { supabase } from './supabaseClient.js'

function makeKey(key, shared) {
  return shared ? key : key
}

window.storage = {
  async get(key, shared = false) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión')
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('agent_id', user.id)
      .eq('key', makeKey(key, shared))
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return { key, value: JSON.stringify(data.value), shared }
  },

  async set(key, value, shared = false) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión')
    const { error } = await supabase
      .from('app_data')
      .upsert({
        agent_id: user.id,
        key: makeKey(key, shared),
        value: JSON.parse(value),
        updated_at: new Date().toISOString(),
      })
    if (error) throw error
    return { key, value, shared }
  },

  async delete(key, shared = false) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión')
    const { error } = await supabase
      .from('app_data')
      .delete()
      .eq('agent_id', user.id)
      .eq('key', makeKey(key, shared))
    if (error) throw error
    return { key, deleted: true, shared }
  },

  async list(prefix = '', shared = false) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión')
    const { data, error } = await supabase
      .from('app_data')
      .select('key')
      .eq('agent_id', user.id)
      .like('key', `${prefix}%`)
    if (error) throw error
    return { keys: (data || []).map((d) => d.key), prefix, shared }
  },
}