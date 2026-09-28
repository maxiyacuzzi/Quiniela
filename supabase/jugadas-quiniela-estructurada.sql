-- Para que una jugada de quiniela cargada en Clientes se pueda controlar
-- automáticamente contra los resultados reales (igual que hace Controlar
-- Premio), guardamos los mismos datos estructurados que usa Crear Jugada en
-- vez de solo una descripción libre. Solo se completan cuando juego='quiniela'
-- — para quini6/loto/brinco se sigue usando la descripción libre.
alter table jugadas_clientes add column if not exists fecha date;
alter table jugadas_clientes add column if not exists jurisdiccion_slug text;
alter table jugadas_clientes add column if not exists turno text;
alter table jugadas_clientes add column if not exists numero_jugado text;
alter table jugadas_clientes add column if not exists alcance integer;
