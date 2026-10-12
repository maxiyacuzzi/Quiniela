import { getSupabaseAdmin } from "./supabase";

// Cuenta general en efectivo: la "caja fuerte" del local. Independiente de
// la cuenta de premios (Córdoba) y de las transferencias, que ya se
// arrastran solas corte a corte como una cuenta bancaria real — acá solo se
// trackea el efectivo físico que no está en ningún cajón en este momento.

export type TipoMovimientoCuentaGeneral = "apertura" | "cierre" | "premio" | "manual";

export interface MovimientoCuentaGeneral {
  id: string;
  monto: number; // positivo: entra. negativo: sale.
  concepto: string;
  tipo: TipoMovimientoCuentaGeneral;
  creadoPor: string | null;
  creadoEn: string;
}

export interface CuentaGeneral {
  saldo: number;
  movimientos: MovimientoCuentaGeneral[];
}

export async function getCuentaGeneral(limite = 20): Promise<CuentaGeneral> {
  const supabase = getSupabaseAdmin();

  const [{ data: todos, error: errorTodos }, { data: recientes, error: errorRecientes }] =
    await Promise.all([
      supabase.from("cuenta_general_movimientos").select("monto"),
      supabase
        .from("cuenta_general_movimientos")
        .select("id, monto, concepto, tipo, creado_en, perfiles(nombre)")
        .order("creado_en", { ascending: false })
        .limit(limite),
    ]);

  if (errorTodos) throw new Error(`Error al calcular el saldo: ${errorTodos.message}`);
  if (errorRecientes) throw new Error(`Error al leer los movimientos: ${errorRecientes.message}`);

  const saldo = (todos ?? []).reduce((acc, m) => acc + Number(m.monto), 0);

  const movimientos: MovimientoCuentaGeneral[] = (recientes ?? []).map((m) => ({
    id: m.id,
    monto: Number(m.monto),
    concepto: m.concepto,
    tipo: m.tipo as TipoMovimientoCuentaGeneral,
    creadoPor: (m.perfiles as unknown as { nombre: string } | null)?.nombre ?? null,
    creadoEn: m.creado_en,
  }));

  return { saldo, movimientos };
}

// Movimiento automático de apertura ("sale" el fondo fijo) o cierre ("entra"
// todo lo contado) de un turno. Un mismo corte tiene a lo sumo uno de cada
// tipo (ver el índice único parcial en supabase/cuenta-general.sql, que
// actúa como red de seguridad): cerrar de nuevo tras reabrir actualiza ese
// mismo movimiento en vez de duplicarlo. Busca-y-actualiza-o-inserta a mano
// en vez de upsert: Postgres no deja usar un índice único PARCIAL como
// destino de ON CONFLICT desde PostgREST.
export async function registrarMovimientoCorte(params: {
  corteId: string;
  tipo: "apertura" | "cierre";
  monto: number;
  concepto: string;
  creadoPor: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: existente, error: errorBuscar } = await supabase
    .from("cuenta_general_movimientos")
    .select("id")
    .eq("corte_id", params.corteId)
    .eq("tipo", params.tipo)
    .maybeSingle();
  if (errorBuscar) {
    throw new Error(`Error al registrar el movimiento de la cuenta general: ${errorBuscar.message}`);
  }

  if (existente) {
    const { error } = await supabase
      .from("cuenta_general_movimientos")
      .update({ monto: params.monto, concepto: params.concepto, creado_por: params.creadoPor })
      .eq("id", existente.id);
    if (error) throw new Error(`Error al actualizar el movimiento de la cuenta general: ${error.message}`);
    return;
  }

  const { error } = await supabase.from("cuenta_general_movimientos").insert({
    corte_id: params.corteId,
    tipo: params.tipo,
    monto: params.monto,
    concepto: params.concepto,
    creado_por: params.creadoPor,
  });
  if (error) throw new Error(`Error al registrar el movimiento de la cuenta general: ${error.message}`);
}

// Al reabrir un corte ya cerrado, ese cierre "no pasó": se borra el depósito
// que había generado (si al volver a cerrarlo corresponde otro, se crea de
// nuevo con registrarMovimientoCorte).
export async function borrarMovimientoCierre(corteId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("cuenta_general_movimientos")
    .delete()
    .eq("corte_id", corteId)
    .eq("tipo", "cierre");
  if (error) throw new Error(`Error al deshacer el cierre: ${error.message}`);
}

// Retiro automático porque un premio pagado en efectivo superó lo que había
// físicamente en el cajón del turno (ver cargarPremioAction).
export async function registrarRetiroPorPremio(params: {
  corteId: string;
  premioId: string;
  monto: number; // positivo: lo que se retira
  concepto: string;
  creadoPor: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cuenta_general_movimientos").insert({
    corte_id: params.corteId,
    premio_id: params.premioId,
    tipo: "premio",
    monto: -params.monto,
    concepto: params.concepto,
    creado_por: params.creadoPor,
  });
  if (error) throw new Error(`Error al retirar de la cuenta general: ${error.message}`);
}

export async function agregarMovimientoManual(params: {
  monto: number; // positivo: ingreso. negativo: egreso.
  concepto: string;
  creadoPor: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cuenta_general_movimientos").insert({
    tipo: "manual",
    monto: params.monto,
    concepto: params.concepto,
    creado_por: params.creadoPor,
  });
  if (error) throw new Error(`Error al agregar el movimiento: ${error.message}`);
}
