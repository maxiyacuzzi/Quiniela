import { createClient } from "@supabase/supabase-js";
import ws from "ws";

// Fecha de prueba: tiene que estar vacía en la base (se verifica antes de sembrar)
// para no pisar nunca datos reales de la agencia.
export const FECHA_PRUEBA = "2026-01-05";
const DIA_SIGUIENTE = "2026-01-06";

export interface DatosPrueba {
  fecha: string;
  password: string;
  duenoEmail: string;
  empleadoEmail: string;
  duenoId: string;
  empleadoId: string;
  clienteId: string;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan las variables de Supabase en .env.local");
  return createClient(url, key, {
    auth: { persistSession: false },
    realtime: { transport: ws as unknown as never },
  });
}

export async function prepararDatos(): Promise<DatosPrueba> {
  const s = admin();
  const creados: Partial<DatosPrueba> = { fecha: FECHA_PRUEBA };
  try {
    return await sembrar(s, creados);
  } catch (e) {
    // Si algo falla a mitad de la siembra no queda nada a medias en la base.
    await limpiarDatos(creados as DatosPrueba).catch(() => undefined);
    throw e;
  }
}

async function sembrar(s: ReturnType<typeof admin>, creados: Partial<DatosPrueba>): Promise<DatosPrueba> {

  const { data: cortes } = await s.from("cortes_caja").select("id").eq("fecha", FECHA_PRUEBA);
  const { data: ventas } = await s
    .from("ventas_mostrador")
    .select("id")
    .gte("creado_en", `${FECHA_PRUEBA}T00:00:00-03:00`)
    .lt("creado_en", `${DIA_SIGUIENTE}T00:00:00-03:00`);
  if (cortes?.length || ventas?.length) {
    throw new Error(`La fecha de prueba ${FECHA_PRUEBA} tiene datos reales: cambiala en cypress/support/db.ts`);
  }

  const password = `Tmp-${Math.random().toString(36).slice(2)}A1!`;
  const marca = Date.now();
  const ids: Record<string, string> = {};
  const emails: Record<string, string> = {};
  for (const rol of ["dueno", "empleado"] as const) {
    const email = `tmp-cypress-${rol}-${marca}@example.com`;
    const { data, error } = await s.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    const { error: ep } = await s.from("perfiles").insert({ id: data.user.id, nombre: `TMP ${rol}`, rol });
    if (ep) throw ep;
    ids[rol] = data.user.id;
    emails[rol] = email;
    if (rol === "dueno") creados.duenoId = data.user.id;
    else creados.empleadoId = data.user.id;
  }

  const { data: cli, error: ec } = await s.from("clientes").insert({ nombre: "TMP CLIENTE" }).select("id").single();
  if (ec) throw ec;
  creados.clienteId = cli.id;

  const t = `${FECHA_PRUEBA}T13:00:00-03:00`;
  const { data: m1 } = await s
    .from("movimientos_cliente")
    .insert({ cliente_id: cli.id, monto: 2000, concepto: "Jugada (Quiniela)", creado_en: t })
    .select("id")
    .single();
  await s.from("jugadas_clientes").insert({
    cliente_id: cli.id, juego: "quiniela", descripcion: "Quiniela", importe: 2000,
    fiado: true, movimiento_id: m1!.id, fecha: FECHA_PRUEBA, creado_en: t,
  });
  const { data: m2 } = await s
    .from("movimientos_cliente")
    .insert({ cliente_id: cli.id, monto: -500, concepto: "Premio (Quiniela): x", creado_en: t })
    .select("id")
    .single();
  await s.from("premios_clientes").insert({
    cliente_id: cli.id, juego: "quiniela", descripcion: "x", monto: 500,
    pagado: false, movimiento_id: m2!.id, fecha_sorteo: FECHA_PRUEBA, creado_en: t,
  });
  await s.from("movimientos_cliente").insert({
    cliente_id: cli.id, monto: -300, concepto: "Cobro de deuda", medio_pago: "efectivo", cobro_deuda: true, creado_en: t,
  });

  return {
    fecha: FECHA_PRUEBA,
    password,
    duenoEmail: emails.dueno,
    empleadoEmail: emails.empleado,
    duenoId: ids.dueno,
    empleadoId: ids.empleado,
    clienteId: cli.id,
  };
}

function ok(paso: string, error: { message: string } | null) {
  if (error) throw new Error(`No se pudo limpiar (${paso}): ${error.message}`);
}

export async function limpiarDatos(d: Partial<DatosPrueba>): Promise<void> {
  const s = admin();
  const fecha = d.fecha ?? FECHA_PRUEBA;
  const usuarios = [d.duenoId, d.empleadoId].filter((x): x is string => !!x);

  if (d.clienteId) {
    ok("jugadas", (await s.from("jugadas_clientes").delete().eq("cliente_id", d.clienteId)).error);
    ok("premios", (await s.from("premios_clientes").delete().eq("cliente_id", d.clienteId)).error);
    ok("movimientos", (await s.from("movimientos_cliente").delete().eq("cliente_id", d.clienteId)).error);
    ok("cliente", (await s.from("clientes").delete().eq("id", d.clienteId)).error);
  }
  if (usuarios.length) {
    ok(
      "ventas",
      (
        await s
          .from("ventas_mostrador")
          .delete()
          .gte("creado_en", `${fecha}T00:00:00-03:00`)
          .lt("creado_en", `${DIA_SIGUIENTE}T00:00:00-03:00`)
          .in("creado_por", usuarios)
      ).error
    );
    // Los cortes de la fecha de prueba son nuestros: la siembra verificó que estaba vacía.
    ok("cortes", (await s.from("cortes_caja").delete().eq("fecha", fecha)).error); // borra en cascada sus movimientos
    ok("perfiles", (await s.from("perfiles").delete().in("id", usuarios)).error);
    for (const id of usuarios) {
      const { error } = await s.auth.admin.deleteUser(id);
      if (error && !/not found/i.test(error.message)) ok("usuario", error);
    }
  }
}

// Red de seguridad: borra lo que pudo quedar de una corrida interrumpida (Ctrl+C,
// caída de la red, CI cancelado). Solo toca datos inequívocamente de prueba:
// usuarios "tmp-cypress-*", clientes "TMP ..." y, únicamente si aparecen esos
// restos, lo cargado en la fecha de prueba. Nunca borra por fecha "a ciegas".
export async function barrerRestos(): Promise<{ usuarios: number; clientes: number }> {
  const s = admin();

  const { data: lista, error: eu } = await s.auth.admin.listUsers({ perPage: 1000 });
  ok("listar usuarios", eu);
  const usuarios = (lista?.users ?? []).filter((u) => u.email?.startsWith("tmp-cypress-")).map((u) => u.id);

  const { data: clientes, error: ec } = await s.from("clientes").select("id").ilike("nombre", "TMP %");
  ok("listar clientes", ec);

  const hayRestos = usuarios.length > 0 || (clientes?.length ?? 0) > 0;
  if (!hayRestos) return { usuarios: 0, clientes: 0 };

  for (const c of clientes ?? []) {
    await limpiarDatos({ fecha: FECHA_PRUEBA, clienteId: c.id, duenoId: usuarios[0], empleadoId: usuarios[1] });
  }
  // Usuarios sueltos sin cliente asociado.
  await limpiarDatos({ fecha: FECHA_PRUEBA, duenoId: usuarios[0], empleadoId: usuarios[1] });
  for (const id of usuarios.slice(2)) await limpiarDatos({ fecha: FECHA_PRUEBA, duenoId: id });

  return { usuarios: usuarios.length, clientes: clientes?.length ?? 0 };
}

// Para probar que corregir un corte YA cerrado sigue permitido aunque su día
// haya pasado (bypassea guardarCorteAction a propósito: eso es justo lo que
// la UI bloquea para un corte sin cerrar, pero no para uno que ya se cerró).
export async function sembrarCorteCerrado(fecha: string, turno: "mediodia" | "cierre"): Promise<void> {
  const s = admin();
  const { error } = await s.from("cortes_caja").upsert(
    {
      fecha,
      turno,
      saldo_inicial: 0,
      saldo_inicial_transferencia: 0,
      cerrado: true,
      monto_contado: 1000,
      monto_contado_transferencia: null,
    },
    { onConflict: "fecha,turno" }
  );
  if (error) throw new Error(`No se pudo sembrar el corte cerrado: ${error.message}`);
}

export async function consultarCliente(clienteId: string) {
  const s = admin();
  const [jugadas, premios, movimientos] = await Promise.all([
    s.from("jugadas_clientes").select("fiado, medio_pago, movimiento_id").eq("cliente_id", clienteId),
    s
      .from("premios_clientes")
      .select("id, pagado, medio_pago, monto, monto_efectivo, monto_transferencia, monto_cuenta")
      .eq("cliente_id", clienteId),
    s.from("movimientos_cliente").select("monto, concepto, cobro_deuda").eq("cliente_id", clienteId),
  ]);
  return { jugadas: jugadas.data ?? [], premios: premios.data ?? [], movimientos: movimientos.data ?? [] };
}

// Clientes extra, independientes de prepararDatos(), para probar los
// filtros/orden de /gestion/clientes: uno que debe, uno al que le debemos,
// uno sin saldo y uno inactivo.
export interface ClientesFiltro {
  meDebe: string;
  leDebo: string;
  sinSaldo: string;
  inactivo: string;
}

export async function sembrarClientesFiltro(): Promise<ClientesFiltro> {
  const s = admin();
  const crear = async (nombre: string, activo = true) => {
    const { data, error } = await s.from("clientes").insert({ nombre, activo }).select("id").single();
    if (error) throw new Error(`No se pudo crear ${nombre}: ${error.message}`);
    return data.id as string;
  };

  const meDebe = await crear("TMP FILTRO Zeta (me debe)");
  const leDebo = await crear("TMP FILTRO Alfa (le debo)");
  const sinSaldo = await crear("TMP FILTRO Beta (sin saldo)");
  const inactivo = await crear("TMP FILTRO Omega (inactivo)", false);

  const { error: e1 } = await s
    .from("movimientos_cliente")
    .insert({ cliente_id: meDebe, monto: 500, concepto: "Jugada (Quiniela)" });
  if (e1) throw new Error(`No se pudo cargar el saldo de prueba: ${e1.message}`);
  const { error: e2 } = await s
    .from("movimientos_cliente")
    .insert({ cliente_id: leDebo, monto: -300, concepto: "Premio (Quiniela): x" });
  if (e2) throw new Error(`No se pudo cargar el saldo de prueba: ${e2.message}`);

  return { meDebe, leDebo, sinSaldo, inactivo };
}

export async function limpiarClientesFiltro(c: ClientesFiltro): Promise<void> {
  const s = admin();
  const ids = Object.values(c);
  await s.from("movimientos_cliente").delete().in("cliente_id", ids);
  await s.from("clientes").delete().in("id", ids);
}

// Cliente + una jugada pendiente y un premio liquidado, con creado_en = ahora
// (no FECHA_PRUEBA), para que aparezcan sí o sí en "Actividad reciente" de
// /gestion/jugadas (que muestra los últimos 30 sin importar la fecha).
export interface ActividadFiltro {
  clienteId: string;
}

export async function sembrarActividadFiltro(): Promise<ActividadFiltro> {
  const s = admin();
  const { data: cli, error: ec } = await s
    .from("clientes")
    .insert({ nombre: "TMP ACTIVIDAD Filtro" })
    .select("id")
    .single();
  if (ec) throw new Error(`No se pudo crear el cliente: ${ec.message}`);

  const { error: ej } = await s.from("jugadas_clientes").insert({
    cliente_id: cli.id,
    juego: "quiniela",
    descripcion: "Quiniela",
    importe: 777,
    fiado: true,
  });
  if (ej) throw new Error(`No se pudo cargar la jugada: ${ej.message}`);

  const { error: ep } = await s.from("premios_clientes").insert({
    cliente_id: cli.id,
    juego: "quini6",
    descripcion: "premio test filtro",
    monto: 888,
    pagado: true,
    medio_pago: "efectivo",
  });
  if (ep) throw new Error(`No se pudo cargar el premio: ${ep.message}`);

  return { clienteId: cli.id };
}

export async function limpiarActividadFiltro(a: ActividadFiltro): Promise<void> {
  const s = admin();
  await s.from("jugadas_clientes").delete().eq("cliente_id", a.clienteId);
  await s.from("premios_clientes").delete().eq("cliente_id", a.clienteId);
  await s.from("movimientos_cliente").delete().eq("cliente_id", a.clienteId);
  await s.from("clientes").delete().eq("id", a.clienteId);
}

// Cliente con una deuda de un monto exacto, para probar que el sistema
// calcula solo cuánto hay que pagarle al registrarle un premio (ver
// calcularNetoPremio en lib/deuda-premio.ts).
export interface ClienteDeuda {
  clienteId: string;
}

export async function sembrarClienteDeuda(monto: number): Promise<ClienteDeuda> {
  const s = admin();
  const { data: cli, error: ec } = await s
    .from("clientes")
    .insert({ nombre: "TMP DEUDA Cliente" })
    .select("id")
    .single();
  if (ec) throw new Error(`No se pudo crear el cliente: ${ec.message}`);
  const { error: em } = await s
    .from("movimientos_cliente")
    .insert({ cliente_id: cli.id, monto, concepto: "Jugada (Quiniela)" });
  if (em) throw new Error(`No se pudo cargar la deuda: ${em.message}`);
  return { clienteId: cli.id };
}

export async function limpiarClienteDeuda(c: ClienteDeuda): Promise<void> {
  const s = admin();
  await s.from("premios_clientes").delete().eq("cliente_id", c.clienteId);
  await s.from("movimientos_cliente").delete().eq("cliente_id", c.clienteId);
  await s.from("clientes").delete().eq("id", c.clienteId);
}

// Borra un corte de prueba (cascada a sus movimientos_caja) y los
// movimientos que haya generado en la cuenta general — para que un test que
// abre/cierra un turno de FECHA_PRUEBA no le deje restos a esa cuenta real.
export async function limpiarCorteYCuentaGeneral(corteId: string): Promise<void> {
  const s = admin();
  await s.from("cuenta_general_movimientos").delete().eq("corte_id", corteId);
  await s.from("cortes_caja").delete().eq("id", corteId);
}

// La apertura/cierre y el aporte por premio de la cuenta general solo se
// pueden probar sobre el turno REAL de hoy (esa lógica usa la hora actual,
// no una fecha de prueba) — por eso el test de cuenta-general.cy.ts primero
// chequea con esto que nadie lo abrió todavía, para no tocar un turno real.
function fechaHoyArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}
function turnoActualArgentina(): "mediodia" | "cierre" {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  return hora < 14 ? "mediodia" : "cierre";
}

// Cliente sin ningún movimiento previo (a diferencia de "TMP CLIENTE", el de
// prepararDatos(), que ya arrastra deuda propia del fixture) — para probar
// el aporte automático de la cuenta general con un neto a pagar predecible.
export async function sembrarClienteLimpio(nombre: string): Promise<{ clienteId: string }> {
  const s = admin();
  const { data, error } = await s.from("clientes").insert({ nombre }).select("id").single();
  if (error) throw new Error(`No se pudo crear el cliente: ${error.message}`);
  return { clienteId: data.id };
}

export async function limpiarClienteLimpio(clienteId: string): Promise<void> {
  const s = admin();
  await s.from("premios_clientes").delete().eq("cliente_id", clienteId);
  await s.from("movimientos_cliente").delete().eq("cliente_id", clienteId);
  await s.from("clientes").delete().eq("id", clienteId);
}

export async function limpiarMovimientoCuentaGeneral(concepto: string): Promise<void> {
  const s = admin();
  const { error } = await s.from("cuenta_general_movimientos").delete().eq("concepto", concepto);
  if (error) throw new Error(`No se pudo limpiar el movimiento de la cuenta general: ${error.message}`);
}

export async function buscarCorteHoy(): Promise<{ id: string; fecha: string; turno: string } | null> {
  const s = admin();
  const { data, error } = await s
    .from("cortes_caja")
    .select("id, fecha, turno")
    .eq("fecha", fechaHoyArgentina())
    .eq("turno", turnoActualArgentina())
    .maybeSingle();
  if (error) throw new Error(`Error al buscar el corte de hoy: ${error.message}`);
  return data ?? null;
}
