-- Cuenta bancaria donde la Quiniela de Córdoba deposita los premios grandes
-- que le corresponde pagar a la agencia. Es independiente de la caja y de
-- los premios de clientes — un librito aparte con saldo acumulado real que
-- se arrastra día a día (no se resetea por turno).
create table if not exists cuenta_premios_movimientos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  monto numeric not null, -- positivo: depósito de la Quiniela de Córdoba. negativo: retiro/pago.
  concepto text not null,
  creado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create index if not exists cuenta_premios_movimientos_fecha_idx
  on cuenta_premios_movimientos (fecha desc);

alter table cuenta_premios_movimientos enable row level security;
