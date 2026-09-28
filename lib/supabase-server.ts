import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para Server Components/Actions dentro de /gestion: usa
// la anon key + las cookies de sesión del usuario logueado, así que respeta
// Row Level Security (a diferencia de getSupabaseAdmin, que usa service_role
// y no debe usarse para leer datos "como" un usuario).
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno"
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Llamado desde un Server Component (no se pueden escribir cookies
          // ahí) — no pasa nada, el middleware ya se encarga de refrescar la
          // sesión en cada request.
        }
      },
    },
  });
}
