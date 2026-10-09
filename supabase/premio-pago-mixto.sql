-- Pagar un premio admite "mixto": parte en efectivo y parte por
-- transferencia, descontando de las dos cuentas. monto_efectivo +
-- monto_transferencia tiene que sumar el monto total del premio — eso se
-- valida en el server action (cargarPremioAction / editarPremioAction), no
-- acá, para poder dar un mensaje claro.
alter table premios_clientes drop constraint if exists premios_clientes_medio_pago_check;
alter table premios_clientes
  add constraint premios_clientes_medio_pago_check
    check (medio_pago in ('efectivo', 'transferencia', 'mixto'));

alter table premios_clientes add column if not exists monto_efectivo numeric;
alter table premios_clientes add column if not exists monto_transferencia numeric;
