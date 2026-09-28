import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para componentes de cliente ("use client"): usa la
// anon key (pública) y respeta Row Level Security según el usuario logueado.
// Solo se usa dentro de /gestion (login, cerrar sesión, cambiar contraseña).
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno"
    );
  }

  return createBrowserClient(url, anonKey);
}
