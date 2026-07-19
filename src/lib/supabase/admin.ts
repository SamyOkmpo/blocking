import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente con la service role key: salta RLS. Úsalo SOLO en rutas de
 * servidor de confianza (el cron de notificaciones), nunca en código que
 * llegue al navegador — la key es secreta.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
