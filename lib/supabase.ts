import { createClient } from "@supabase/supabase-js";

// Cliente con la service role key: solo se usa en código server-side
// (route handlers, server actions, scripts). Nunca importar desde un client component.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
