## Cabezas del día

App que scrapea `https://vivitusuerte.com/cabezas` (resultados de quiniela argentina por
jurisdicción y turno), los guarda en Supabase, y los muestra en una grilla propia.

### 1. Crear el proyecto en Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Abrí el **SQL Editor** y corré el contenido de `supabase/schema.sql`.
3. En **Project Settings → API** copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` key (secreta, no la `anon`) → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Variables de entorno

```
cp .env.local.example .env.local
```

Completá `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y elegí un `SCRAPE_SECRET`
(un string random largo — protege el endpoint que dispara el scraping).

### 3. Instalar y correr

```
npm install
npm run dev
```

La primera vez la tabla va a estar vacía. Para cargar datos:

```
npm run scrape
```

(equivalente a llamar `POST /api/scrape` con el header `x-scrape-secret: <SCRAPE_SECRET>`).
También podés usar el botón **"Actualizar ahora"** en la página.

### 4. Actualización automática (10, 13, 16 y 21 hs, hora Argentina)

**Si deployás en Vercel:** `vercel.json` ya define los 4 cron jobs (convertidos a UTC). Solo
asegurate de cargar las variables de entorno en el proyecto de Vercel. Opcionalmente activá
"Protect Cron Jobs" en la configuración del proyecto — el endpoint ya acepta el header
`Authorization: Bearer <SCRAPE_SECRET>` que Vercel manda en ese caso.

**Si corrés en otro lado (tu máquina, un VPS, etc.):** programá `npm run scrape` con `cron` o
`node-cron` a las horas deseadas, por ejemplo con crontab:

```
0 10,13,16,21 * * * cd /ruta/a/quiniela-app && npm run scrape >> scrape.log 2>&1
```

### Estructura

- `lib/scraper.ts` — descarga y parsea el HTML fuente.
- `lib/ingest.ts` — hace upsert en Supabase (no duplica filas, va completando turnos a medida que salen).
- `lib/queries.ts` — lecturas para la UI.
- `app/api/scrape/route.ts` — endpoint protegido que dispara scraper + ingest (usado por cron y por el botón manual).
- `app/page.tsx` — grilla principal (jurisdicción × turno) con selector de fecha.
- `scripts/scrape-once.ts` — mismo scrape, ejecutable standalone (`npm run scrape`).
