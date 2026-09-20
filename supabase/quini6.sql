-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).

create table if not exists quini6_resultados (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  sorteo text,
  modalidad text not null check (
    modalidad in ('tradicional_1', 'tradicional_2', 'revancha', 'siempre_sale')
  ),
  numeros text[] not null,
  actualizado_en timestamptz not null default now(),
  unique (fecha, modalidad)
);

create index if not exists quini6_resultados_fecha_idx on quini6_resultados (fecha desc);

-- Igual que "resultados": solo se lee/escribe desde el server con la service role key.
alter table quini6_resultados enable row level security;
