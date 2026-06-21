import { createClient } from '@supabase/supabase-js'

// Anon client for browser-side reads (profile, settings) once session is established
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
