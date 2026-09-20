## Cabezas del día

App que trae resultados de quiniela argentina (Ciudad, Provincia, Córdoba, Entre Ríos y Santa
Fe — cabeza + primeros 10 números por turno) desde la API interna de vivitusuerte.com, los
guarda en Supabase, y los muestra en una grilla propia con calendario para ver cualquier fecha
pasada.

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

No hace falta cargar datos a mano: al abrir la página (o elegir una fecha en el calendario) que
todavía no esté guardada, la app la trae de la fuente automáticamente y la cachea en Supabase
para la próxima vez. `npm run scrape` (o el botón **"Actualizar ahora"**) sirve para forzar una
actualización del día de hoy — útil mientras los turnos van saliendo.

### 4. Actualización automática (según el horario real de cada sorteo)

Los horarios de sorteo son: Previa 10:15, Primera 12:00, Matutina 15:00, Vespertina 18:00,
Nocturna 21:00 (hora Argentina). El cron corre ~10 min después de cada uno, para dar tiempo a
que el resultado ya esté publicado en la fuente: 10:25, 12:10, 15:10, 18:10, 21:10.

**Si deployás en Vercel:** `vercel.json` ya define esos 5 cron jobs (convertidos a UTC). Solo
asegurate de cargar las variables de entorno en el proyecto de Vercel. Opcionalmente activá
"Protect Cron Jobs" en la configuración del proyecto — el endpoint ya acepta el header
`Authorization: Bearer <SCRAPE_SECRET>` que Vercel manda en ese caso.

**Si deployás en Netlify:** `netlify.toml` define 5 Netlify Scheduled Functions
(`netlify/functions/scrape-*.ts`, mismos horarios en UTC) que llaman a `/api/scrape` con el
header `x-scrape-secret`. Solo necesitás tener `SCRAPE_SECRET` cargado en las variables de
entorno del sitio — `URL` (la URL pública del sitio) la inyecta Netlify automáticamente. No
hace falta ningún paso extra: al hacer deploy, Netlify detecta el `schedule` de cada función y
las programa solo.

**Si corrés en otro lado (tu máquina, un VPS, etc.):** programá `npm run scrape` con `cron` o
`node-cron` a esos horarios, por ejemplo con crontab:

```
25 10 * * * cd /ruta/a/quiniela-app && npm run scrape >> scrape.log 2>&1
10 12 * * * cd /ruta/a/quiniela-app && npm run scrape >> scrape.log 2>&1
10 15 * * * cd /ruta/a/quiniela-app && npm run scrape >> scrape.log 2>&1
10 18 * * * cd /ruta/a/quiniela-app && npm run scrape >> scrape.log 2>&1
10 21 * * * cd /ruta/a/quiniela-app && npm run scrape >> scrape.log 2>&1
```

**Sobre el sorteo "Turista":** no está disponible — la fuente (vivitusuerte.com) no lo
publica para ninguna de estas jurisdicciones (se revisó la página de pizarra, la API interna, y
fechas de temporada alta). Si en algún momento aparece otra fuente que sí lo tenga, se puede
sumar como un sexto turno.

### Estructura

- `lib/jurisdicciones.ts` — las 5 jurisdicciones que se scrapean (ciudad, provincia, córdoba, entre ríos, santa fe).
- `lib/scraper.ts` — llama a la API interna de vivitusuerte.com (`/api/juegos/pizarras`) para una fecha dada; funciona para cualquier fecha histórica, no solo "hoy".
- `lib/ingest.ts` — hace upsert en Supabase (no duplica filas, va completando turnos a medida que salen).
- `lib/historial.ts` — `asegurarFecha(fecha)`: si esa fecha no está guardada, la scrapea y la guarda; si ya está, no vuelve a pedirla. Esto es lo que le da soporte al calendario.
- `lib/fechas.ts` — fecha de "hoy" en huso horario Argentina (usado por el cron y el botón manual).
- `lib/queries.ts` — lecturas para la UI.
- `app/api/scrape/route.ts` — endpoint protegido que fuerza el scrape del día de hoy (usado por cron y por el botón manual).
- `app/page.tsx` — grilla principal (jurisdicción × turno, cabeza + 10 números) con selector de fecha tipo calendario.
- `scripts/scrape-once.ts` — mismo scrape de "hoy", ejecutable standalone (`npm run scrape`).
