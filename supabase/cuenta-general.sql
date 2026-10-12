-- Cuenta general en efectivo: la "caja fuerte" del local. Cada turno arranca
-- con un fondo fijo que sale de acá (ver abrirCorte en lib/caja.ts) y, al
-- cerrarse, todo el efectivo contado vuelve acá (el cajón queda en $0 hasta
-- la próxima apertura). Si un premio pagado en efectivo supera lo que hay en
-- el cajón del turno, la diferencia sale sola de acá. Es independiente de la
-- cuenta de premios (Córdoba) y de las transferencias, que ya se arrastran
-- solas corte a corte como una cuenta bancaria real.
create table if not exists cuenta_general_movimientos (
  id uuid primary key default gen_random_uuid(),
  monto numeric not null, -- positivo: entra (cierre de turno, ajuste manual). negativo: sale (apertura, premio, ajuste manual).
  concepto text not null,
  tipo text not null check (tipo in ('apertura', 'cierre', 'premio', 'manual')),
  corte_id uuid references cortes_caja (id) on delete set null,
  premio_id uuid references premios_clientes (id) on delete set null,
  creado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

-- Red de seguridad: a lo sumo un movimiento de apertura y uno de cierre por
-- corte (reabrir y volver a cerrar con otro monto actualiza el mismo
-- movimiento a mano, ver registrarMovimientoCorte en lib/cuenta-general.ts —
-- no se usa como destino de ON CONFLICT porque Postgres no lo permite sobre
-- un índice parcial desde PostgREST). Los de "premio" y "manual" no son
-- únicos: puede haber varios en el mismo corte.
create unique index if not exists cuenta_general_movimientos_corte_tipo_idx
  on cuenta_general_movimientos (corte_id, tipo)
  where tipo in ('apertura', 'cierre');

create index if not exists cuenta_general_movimientos_creado_en_idx
  on cuenta_general_movimientos (creado_en desc);

alter table cuenta_general_movimientos enable row level security;
