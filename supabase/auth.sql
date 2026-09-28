-- Perfil de cada usuario que puede loguearse en /gestion (sección privada,
-- separada del resto del sitio que sigue siendo público). Un registro por
-- cada usuario creado en Supabase Auth.
create table if not exists perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('dueno', 'empleado')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table perfiles enable row level security;

-- Cada usuario puede leer su propio perfil (para saber su nombre y rol al
-- entrar a /gestion). Las escrituras (crear/editar perfiles) se hacen desde
-- el servidor con la service_role key, nunca desde el navegador.
create policy "perfiles: leer propio" on perfiles
  for select
  using (auth.uid() = id);
