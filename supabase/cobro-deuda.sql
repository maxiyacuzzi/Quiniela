-- Marca los movimientos de cuenta corriente que son un COBRO DE DEUDA (el
-- cliente pagó plata que debía). La Caja los suma sola: efectivo al cajón,
-- transferencia al total de transferencias, en el corte de cuando se cobró.
alter table movimientos_cliente
  add column if not exists cobro_deuda boolean not null default false;
