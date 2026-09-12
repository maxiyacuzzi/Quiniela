-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).

create table if not exists jurisdicciones (
  slug text primary key,
  nombre text not null,
  orden int not null default 0
);

create table if not exists resultados (
  id uuid primary key default gen_random_uuid(),
  jurisdiccion_slug text not null references jurisdicciones(slug),
  turno text not null check (turno in ('previa', 'primera', 'matutina', 'vespertina', 'nocturna')),
  posicion int not null check (posicion between 1 and 10), -- 1 = "la cabeza"
  numero text,
  fecha date not null,
  actualizado_en timestamptz not null default now(),
  unique (jurisdiccion_slug, turno, posicion, fecha)
);

create index if not exists resultados_fecha_idx on resultados (fecha desc);

-- Las jurisdicciones (solo 5: ciudad, provincia, córdoba, entre ríos, santa fe) se crean
-- automáticamente la primera vez que corre el scraper (ver lib/jurisdicciones.ts + lib/ingest.ts).

-- RLS: estas tablas solo se leen/escriben desde el server con la service role key,
-- así que se deja RLS activado sin políticas (bloquea todo acceso vía anon key).
alter table jurisdicciones enable row level security;
alter table resultados enable row level security;
