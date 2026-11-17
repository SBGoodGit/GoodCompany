import { createClient, type Session } from '@supabase/supabase-js'

// The browser uses Supabase only for sign-up / sign-in / email verification.
// All data goes through the Nuxt server API (/api/*) with the access token.
export default defineNuxtPlugin(async () => {
  const cfg = useRuntimeConfig().public
  const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  })
  const session = useState<Session | null>('session', () => null)
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  supabase.auth.onAuthStateChange((_e, s) => { session.value = s })
  return { provide: { supabase } }
})
