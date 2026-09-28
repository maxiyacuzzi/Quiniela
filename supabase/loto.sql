-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).

create table if not exists loto_resultados (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  sorteo text,
  modalidad text not null check (
    modalidad in ('tradicional', 'match', 'desquite', 'sale_o_sale')
  ),
  numeros text[] not null,
  actualizado_en timestamptz not null default now(),
  unique (fecha, modalidad)
);

create index if not exists loto_resultados_fecha_idx on loto_resultados (fecha desc);

-- Igual que "resultados" y "quini6_resultados": solo se lee/escribe desde el
-- server con la service role key.
alter table loto_resultados enable row level security;
