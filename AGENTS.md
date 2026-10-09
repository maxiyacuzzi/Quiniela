<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Quiniela app (AgenciaKava's)

App de una agencia de lotería argentina. Tiene dos mitades:

- **Pública (sin login):** resultados de quiniela (`/sorteos`, `/ultimo-sorteo`, `/pantalla` para la TV del local), Quini 6, Loto, Brinco, controlar premio / crear jugada (incluye lectura de la foto del ticket con Gemini) y estadísticas.
- **Gestión (`/gestion/*`, con login):** caja y cortes, resumen por día, clientes y cuenta corriente, jugadas/premios, sorteos y usuarios. Roles: `dueno` y `empleado` (`lib/roles.ts`).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript, Tailwind v4.
- Supabase (Postgres + Auth). Esquema en `supabase/*.sql` — no hay migraciones automáticas: cada archivo se corre a mano en el SQL Editor.
- Gemini (`@google/genai`, `lib/gemini.ts`) para leer tickets.
- Deploy en Netlify (`netlify.toml`, scheduled functions en `netlify/functions/`). `vercel.json` queda como alternativa.
- Tests E2E con Cypress (`cypress/`), corren en GitHub Actions (`.github/workflows/e2e.yml`).

## Comandos

```bash
npm run dev          # servidor local en :3000
npm run lint         # eslint
npm run build        # build de producción (CI lo corre antes de los tests)
npm run test:e2e     # levanta dev y corre Cypress headless
npm run cy:open      # Cypress interactivo
npm run scrape       # fuerza el scrape de quiniela de hoy
```

Usar siempre `npm run cy:*` y no `npx cypress` directo: `scripts/cypress.mjs` saca `ELECTRON_RUN_AS_NODE`, que VS Code define y rompe Cypress.

Antes de dar un cambio por terminado: `npm run lint` y `npm run build`. Si tocaste `/gestion/caja/resumen` o login, correr también el spec correspondiente.

## Estructura

- `app/<juego>/` — cada juego (quiniela en la raíz, `quini6/`, `loto/`, `brinco/`) repite el mismo patrón: `page.tsx`, `*Tabs.tsx`, `Crear/Controlar/SubirTicket*.tsx`, y server actions en `controlar-actions.ts`, `ticket-actions.ts`, `ver-sorteos-actions.ts`.
- `lib/<juego>/` — misma idea: `scraper.ts`, `ingest.ts`, `historial.ts`, `queries.ts`, `premio.ts`, `ticket.ts`, `mensaje.ts`, `modalidades.ts`. La quiniela vive en `lib/` directamente. Al agregar algo a un juego, mirar cómo está hecho en los otros y mantener la simetría.
- `lib/` (gestión) — `caja.ts`, `resumen-caja.ts`, `detalle-dia.ts`, `liquidacion.ts`, `clientes.ts`, `cuenta-premios.ts`, `medios-pago.ts`, etc.
- `proxy.ts` — el "middleware" de Next 16 (se llama `proxy`). Solo protege `/gestion/:path*`.

## Convenciones

- **Idioma:** todo en español rioplatense — nombres de funciones/variables, comentarios, textos de UI, mensajes de commit (`Agregar…`, `Corregir…`, `Evitar…`, en infinitivo). Mantenerlo.
- **Comentarios:** explican el *por qué* (límites de Netlify, falsos positivos, decisiones de negocio), no el qué.
- **Mutaciones y lecturas sensibles** van en Server Actions (`"use server"`) al lado de la página, no en route handlers. Las de `/gestion` empiezan con `await requerirPerfil()` (o `requerirPerfil(["dueno"])`) de `lib/perfil.ts` y validan la entrada (`esFechaValida`, etc.) antes de tocar la base.
- **Clientes de Supabase:**
  - `getSupabaseAdmin()` (`lib/supabase.ts`) — service role, salta RLS. Solo server-side; nunca importarlo desde un client component.
  - `getSupabaseServer()` (`lib/supabase-server.ts`) — anon key + cookies, respeta RLS. Para leer "como" el usuario logueado.
  - `lib/supabase-browser.ts` — para client components.
- **Fechas:** siempre strings `YYYY-MM-DD` en hora Argentina. Usar `lib/fechas.ts` (`getFechaHoyArgentina`, `restarDias`, …); no usar `new Date()` a pelo para "hoy".
- **Turnos de quiniela:** Previa, Primera, Matutina, Vespertina, Nocturna (`lib/turnos.ts`). Jurisdicciones en `lib/jurisdicciones.ts` (el orden importa para la UI).
- **Timeout de Netlify (~30s por request):** todo lo que llame a Gemini o scrapee tiene que entrar holgado. Ver `TIMEOUT_GEMINI_MS` en `lib/gemini.ts`. Las Server Actions aceptan hasta 10MB (`next.config.ts`) por las fotos de tickets.

## Variables de entorno (`.env.local`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SCRAPE_SECRET`, `GEMINI_API_KEY`. Nunca commitear `.env.local` ni pegar sus valores en código, logs o PRs.

## Tests E2E — cuidado con la base

Cypress corre contra la **base real de Supabase** (no hay base de test). `cypress/support/db.ts` siembra datos propios (usuarios temporales, un cliente "TMP", la fecha vacía `FECHA_PRUEBA`) y los borra al final; `before:run`/`after:run` barren restos. Al escribir tests:

- Usar solo datos creados por la siembra; nunca leer ni modificar datos reales de la agencia.
- Si hace falta otra fecha, verificar primero que esté vacía, como hace `FECHA_PRUEBA`.
- Si una corrida quedó a medias: `npm run cy:limpiar`.

## Base de datos

Cambios de esquema: agregar un `.sql` nuevo en `supabase/` (idempotente: `if not exists`, `create or replace`) y avisar que hay que correrlo a mano en Supabase. No ejecutar SQL contra la base real sin confirmación.
