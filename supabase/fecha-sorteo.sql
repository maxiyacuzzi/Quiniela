-- Dos fechas por movimiento de plata:
--  * cuándo entró/salió la plata (creado_en) -> define en qué CAJA se cuenta.
--  * para qué sorteo es (fecha del sorteo)   -> define en qué LIQUIDACIÓN/memo entra.
--
-- jugadas_clientes.fecha (ya existía) pasa a ser la fecha del sorteo.
-- ventas_mostrador.fecha ya era la fecha del sorteo.
-- premios_clientes no tenía: se agrega. Si es null se toma el día en que se cargó.
alter table premios_clientes add column if not exists fecha_sorteo date;
