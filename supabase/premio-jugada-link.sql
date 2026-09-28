-- Ya no se registran los números jugados (solo cliente + juego + monto), así
-- que el premio de una jugada no se puede calcular solo — se carga a mano
-- "a partir de" esa jugada puntual. Este link deja ver en la actividad si
-- una jugada ya tiene su premio registrado, incluso después de recargar la
-- página (antes era solo un estado local que se perdía al refrescar).
alter table premios_clientes
  add column if not exists jugada_id uuid references jugadas_clientes (id) on delete set null;

create index if not exists premios_clientes_jugada_idx on premios_clientes (jugada_id);
