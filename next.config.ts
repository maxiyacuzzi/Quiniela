import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// El login/logout/cambio de contraseña de /gestion le pega a Supabase Auth
// directo desde el navegador (lib/supabase-browser.ts).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");

// Sin nonces (ver la guía de CSP de Next): un nonce obliga a renderizar todo
// dinámico y perderíamos el cache de las páginas públicas. 'unsafe-inline'
// en script-src lo necesita Next para hidratar; igual nos cubre de
// clickjacking, plugins, <base> inyectado y fetch a dominios ajenos.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos de tickets (base64) desde el celular superan fácil el 1MB
    // por defecto de las Server Actions.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Netlify ya redirige http→https; HSTS hace que el navegador ni
          // lo intente por http la próxima vez.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // La cámara se usa vía <input type="file" capture>, que no necesita permiso.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Ni el panel ni la API tienen que aparecer en buscadores, aunque
        // alguien linkee una URL suelta (robots.txt solo frena el rastreo).
        source: "/(gestion|api)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
