import { createBrowserClient } from '@supabase/ssr'

let client

export function createClient() {
  if (client) return client

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  client = createBrowserClient(supabaseUrl, supabaseKey)
  return client
}
