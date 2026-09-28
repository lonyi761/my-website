import { createClient } from '@supabase/supabase-js'

// Supabase 專案網址 (已自動去除後綴 /rest/v1/)
const supabaseUrl = 'https://oorpoewtfstasfuxgknk.supabase.co'

// Supabase API Key (Publishable / Anon Key)
const supabaseAnonKey = 'sb_publishable_69i9p_0-w0pCkg-ZP9Fi6g_KIwaF4OK'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)