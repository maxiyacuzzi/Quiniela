-- Agrega el medio de pago (efectivo / transferencia) donde hace falta
-- distinguirlo: en la cuenta corriente de clientes, en jugadas/premios
-- pagados en el momento, y en caja (donde además separa "ventas por
-- transferencia" de las ventas en efectivo, porque la transferencia nunca
-- toca el cajón físico que se cuenta al cerrar el turno).

alter table movimientos_cliente
  add column if not exists medio_pago text check (medio_pago in ('efectivo', 'transferencia'));

alter table jugadas_clientes
  add column if not exists medio_pago text check (medio_pago in ('efectivo', 'transferencia'));

alter table premios_clientes
  add column if not exists medio_pago text check (medio_pago in ('efectivo', 'transferencia'));

alter table cortes_caja
  add column if not exists ventas_transferencia numeric not null default 0;

alter table movimientos_caja
  add column if not exists medio_pago text not null default 'efectivo'
    check (medio_pago in ('efectivo', 'transferencia'));
