import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Solo corre para /gestion/* (ver matcher abajo) — el resto del sitio
// (sorteos, quini6, loto, brinco, controlar premio, crear jugada, pantalla,
// último sorteo, estadísticas) sigue siendo público, sin login.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          // Cache-Control: no-store & co. — una respuesta que setea cookies de
          // sesión nunca puede quedar cacheada en un CDN (serviría la sesión de
          // un usuario a otro). Los entrega la propia librería.
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esLogin = request.nextUrl.pathname === "/gestion/login";

  if (!user && !esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/gestion/login";
    return NextResponse.redirect(url);
  }

  if (user && esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/gestion";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/gestion/:path*"],
};
