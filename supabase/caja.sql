-- Un corte de caja por turno (mediodía: Previa+Primera / cierre: Matutina+
-- Vespertina+Nocturna) y por día. "ventas" y "premios_pagados" se cargan a
-- mano (lo que dice la máquina/talonario); "movimientos_caja" son ingresos o
-- gastos sueltos del turno. El saldo inicial se hereda del corte anterior.
create table if not exists cortes_caja (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  turno text not null check (turno in ('mediodia', 'cierre')),
  saldo_inicial numeric not null default 0,
  ventas numeric not null default 0,
  premios_pagados numeric not null default 0,
  cerrado boolean not null default false,
  monto_contado numeric,
  cerrado_por uuid references perfiles (id),
  cerrado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (fecha, turno)
);

create table if not exists movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  corte_id uuid not null references cortes_caja (id) on delete cascade,
  concepto text not null,
  monto numeric not null, -- positivo: ingreso extra. negativo: gasto/egreso.
  creado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create index if not exists cortes_caja_fecha_idx on cortes_caja (fecha desc);
create index if not exists movimientos_caja_corte_idx on movimientos_caja (corte_id, creado_en desc);

alter table cortes_caja enable row level security;
alter table movimientos_caja enable row level security;
