create table if not exists brinco_resultados (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  sorteo text,
  modalidad text not null check (modalidad in ('tradicional', 'junior')),
  numeros text[] not null,
  actualizado_en timestamptz not null default now(),
  unique (fecha, modalidad)
);

create index if not exists brinco_resultados_fecha_idx on brinco_resultados (fecha desc);

alter table brinco_resultados enable row level security;
