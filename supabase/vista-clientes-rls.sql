-- Las vistas de Postgres corren con los permisos de su dueño (postgres), así
-- que clientes_con_saldo salteaba el RLS de clientes/movimientos_cliente:
-- con la anon key pública cualquiera podía leer nombre, teléfono y saldo de
-- todos los clientes vía /rest/v1/clientes_con_saldo.
--
-- security_invoker hace que la vista respete el RLS de quien consulta. La
-- app la lee siempre con service role (lib/clientes.ts, etc.), así que no
-- cambia nada para /gestion. El revoke es por las dudas: nadie fuera del
-- servidor tiene por qué verla.
alter view clientes_con_saldo set (security_invoker = true);
revoke all on clientes_con_saldo from anon, authenticated;
