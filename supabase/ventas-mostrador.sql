-- Ventas de mostrador: plata cobrada sin estar atada a un cliente puntual
-- (la inmensa mayoría de la quiniela vendida). Reemplaza el campo manual
-- "Ventas" que tenía Caja — acá solo se carga fecha (el día del sorteo, no
-- necesariamente hoy: una jugada cobrada hoy "para mañana" va con fecha de
-- mañana) y el monto. Caja las suma solas, siempre en el corte de Mediodía
-- de esa fecha.
create table if not exists ventas_mostrador (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  monto numeric not null check (monto > 0),
  medio_pago text not null check (medio_pago in ('efectivo', 'transferencia')),
  creado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create index if not exists ventas_mostrador_fecha_idx on ventas_mostrador (fecha);

alter table ventas_mostrador enable row level security;
