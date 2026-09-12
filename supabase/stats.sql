-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- Funciones de estadísticas: top números más frecuentes y más atrasados,
-- para 2, 3 o 4 cifras (se derivan de los últimos dígitos del número guardado,
-- igual que se resuelve una apuesta "a la cabeza" de 2/3 cifras).

create or replace function top_frecuentes(cifras int, top_n int)
returns table(numero text, apariciones bigint)
language sql stable
as $$
  select right(numero, cifras) as numero, count(*) as apariciones
  from resultados
  where numero is not null
  group by right(numero, cifras)
  order by apariciones desc, numero asc
  limit top_n;
$$;

create or replace function top_atrasados(cifras int, top_n int)
returns table(numero text, ultima_fecha date, dias_atraso int)
language sql stable
as $$
  select
    right(numero, cifras) as numero,
    max(fecha) as ultima_fecha,
    (current_date - max(fecha))::int as dias_atraso
  from resultados
  where numero is not null
  group by right(numero, cifras)
  order by ultima_fecha asc, numero asc
  limit top_n;
$$;
