import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let _client: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (_client) return _client
  _client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: true,
        storageKey:        'milo-auth',
      },
    }
  )
  return _client
}