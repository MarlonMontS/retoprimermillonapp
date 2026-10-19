import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la llave service_role. Solo en el servidor.
 * Toda la lectura y escritura de datos pasa por aquí; la autorización se
 * valida en código (ver lib/auth.ts y lib/data/*).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
