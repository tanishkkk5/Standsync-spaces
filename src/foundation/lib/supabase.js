import { createClient } from '@supabase/supabase-js'

// Spaces intentionally reuses StandSync Elevate's Supabase project (free-tier
// project cap). All Spaces tables are prefixed spaces_ so they never collide
// with Elevate's existing schema. See supabase/schema.sql for the tables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in the Elevate project credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
