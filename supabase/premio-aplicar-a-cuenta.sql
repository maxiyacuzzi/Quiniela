-- Si un cliente debe plata y gana un premio, se puede aplicar parte (o todo)
-- del premio a cancelar esa deuda en vez de pagarlo en efectivo/transferencia
-- — no es plata que entra a la caja, es plata que ya le debíamos nosotros
-- compensada contra lo que nos debía él. "cuenta" se suma como cuarta opción
-- de medio_pago (además de poder combinarse con efectivo/transferencia en un
-- pago "mixto"). monto_efectivo + monto_transferencia + monto_cuenta tiene
-- que sumar el monto total del premio — se valida en el server action.
alter table premios_clientes drop constraint if exists premios_clientes_medio_pago_check;
alter table premios_clientes
  add constraint premios_clientes_medio_pago_check
    check (medio_pago in ('efectivo', 'transferencia', 'mixto', 'cuenta'));

alter table premios_clientes add column if not exists monto_cuenta numeric;
