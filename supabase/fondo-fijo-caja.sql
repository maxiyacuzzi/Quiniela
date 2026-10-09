-- La caja en efectivo deja de heredar el saldo del corte anterior: cada
-- turno es un fondo fijo que el dueño define a mano al abrirlo (ver
-- lib/caja.ts -> abrirCorte). Las transferencias sí siguen siendo una cuenta
-- real que se arrastra del corte anterior (saldo_inicial_transferencia no
-- cambia). Se guarda quién lo abrió, igual que ya se guarda quién lo cierra.
alter table cortes_caja
  add column if not exists abierto_por uuid references perfiles (id);
