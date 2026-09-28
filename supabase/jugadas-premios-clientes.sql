-- Registro rápido de "el cliente X jugó/ganó Y", separado del movimiento
-- genérico de cuenta corriente. Cuando corresponde (fiado / no pagado
-- todavía), se genera automáticamente el movimiento en movimientos_cliente
-- y queda linkeado acá — así no hay que cargar las dos cosas a mano.
create table if not exists jugadas_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  juego text not null check (juego in ('quiniela', 'quini6', 'loto', 'brinco')),
  descripcion text not null,
  importe numeric not null check (importe > 0),
  fiado boolean not null default false,
  movimiento_id uuid references movimientos_cliente (id) on delete set null,
  creado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create table if not exists premios_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  juego text not null check (juego in ('quiniela', 'quini6', 'loto', 'brinco')),
  descripcion text not null,
  monto numeric not null check (monto > 0),
  pagado boolean not null default false,
  movimiento_id uuid references movimientos_cliente (id) on delete set null,
  creado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create index if not exists jugadas_clientes_cliente_idx
  on jugadas_clientes (cliente_id, creado_en desc);
create index if not exists premios_clientes_cliente_idx
  on premios_clientes (cliente_id, creado_en desc);

alter table jugadas_clientes enable row level security;
alter table premios_clientes enable row level security;
