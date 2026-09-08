import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sudtvcecdnkbpzzvddfu.supabase.co'
const supabaseKey = 'sb_publishable_ANJ_BkkcnLU8EEq3pqlVRQ_51_xZKz3'

export const supabase = createClient(supabaseUrl, supabaseKey)