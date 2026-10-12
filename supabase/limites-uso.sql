-- Rate limiting de las server actions públicas (lectura de tickets con
-- Gemini, "Actualizar ahora"). En Netlify cada request puede caer en una
-- lambda distinta, así que el contador tiene que vivir en la base y no en
-- memoria.
create table if not exists limites_uso (
  clave text primary key,          -- p.ej. "ticket:1.2.3.4" o "ticket:global"
  ventana_inicio timestamptz not null default now(),
  usos int not null default 0
);

-- Sin policies: solo el servidor (service role) lo toca.
alter table limites_uso enable row level security;

-- Suma un uso a `p_clave` y devuelve true si sigue dentro del cupo
-- (`p_max` usos cada `p_ventana_seg` segundos). Es un solo upsert para que
-- dos requests simultáneos no se pisen.
create or replace function consumir_cupo(p_clave text, p_max int, p_ventana_seg int)
returns boolean
language plpgsql
as $$
declare
  v_usos int;
begin
  insert into limites_uso as l (clave, ventana_inicio, usos)
  values (p_clave, now(), 1)
  on conflict (clave) do update set
    ventana_inicio = case
      when l.ventana_inicio < now() - make_interval(secs => p_ventana_seg) then now()
      else l.ventana_inicio end,
    usos = case
      when l.ventana_inicio < now() - make_interval(secs => p_ventana_seg) then 1
      else l.usos + 1 end
  returning usos into v_usos;

  -- Limpieza oportunista: las claves por IP se acumulan, pero ninguna
  -- ventana dura más de un día.
  if random() < 0.01 then
    delete from limites_uso where ventana_inicio < now() - interval '1 day';
  end if;

  return v_usos <= p_max;
end;
$$;

revoke execute on function consumir_cupo(text, int, int) from public, anon, authenticated;
grant execute on function consumir_cupo(text, int, int) to service_role;
