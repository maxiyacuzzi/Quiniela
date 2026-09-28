create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  sobrenombre text,
  telefono text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Cuenta corriente: monto positivo = el cliente me debe (le fié una jugada,
-- por ejemplo); monto negativo = yo le debo a él (ej. un premio que todavía
-- no le pagué). El saldo de un cliente es la suma de sus movimientos.
create table if not exists movimientos_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  monto numeric not null,
  concepto text not null,
  creado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create index if not exists movimientos_cliente_cliente_idx
  on movimientos_cliente (cliente_id, creado_en desc);

-- Vista de conveniencia: cada cliente con su saldo ya calculado, para no
-- tener que sumar los movimientos a mano en cada pantalla.
create or replace view clientes_con_saldo as
select
  c.id,
  c.nombre,
  c.sobrenombre,
  c.telefono,
  c.activo,
  c.creado_en,
  coalesce(sum(m.monto), 0) as saldo
from clientes c
left join movimientos_cliente m on m.cliente_id = c.id
group by c.id;

alter table clientes enable row level security;
alter table movimientos_cliente enable row level security;
