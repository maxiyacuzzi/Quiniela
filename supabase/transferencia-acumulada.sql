-- La cuenta de transferencias pasa a ser un saldo acumulado (como una cuenta
-- bancaria): cada corte hereda el saldo del anterior. Al cerrar se puede cargar
-- el saldo real que se ve en el banco, para detectar diferencias.
alter table cortes_caja
  add column if not exists saldo_inicial_transferencia numeric not null default 0,
  add column if not exists monto_contado_transferencia numeric;
