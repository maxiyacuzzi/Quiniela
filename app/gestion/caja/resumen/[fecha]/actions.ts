"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requerirPerfil } from "@/lib/perfil";
import { obtenerOCrearCorte, TurnoCaja } from "@/lib/caja";
import { esFechaValida } from "@/lib/fechas";
import { MedioPago, MEDIOS_PAGO } from "@/lib/medios-pago";
import { Juego, JUEGOS, JUEGO_LABEL } from "@/lib/actividad-clientes";

// Correcciones de un día ya cargado. Todas son solo del dueño: cambian números
// de caja que pueden estar cerrados.

function positivo(n: number, campo: string) {
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${campo} tiene que ser mayor a 0`);
}
function noNegativo(n: number, campo: string) {
  if (!Number.isFinite(n) || n < 0) throw new Error(`${campo} tiene que ser 0 o más`);
}
function medio(m: MedioPago | null, requerido: boolean): MedioPago | null {
  if (m === null) {
    if (requerido) throw new Error("Falta el medio de pago");
    return null;
  }
  if (!MEDIOS_PAGO.includes(m)) throw new Error("Medio de pago inválido");
  return m;
}
function juego(j: Juego) {
  if (!JUEGOS.includes(j)) throw new Error("Juego inválido");
}
function turnoValido(t: TurnoCaja) {
  if (t !== "mediodia" && t !== "cierre") throw new Error("Turno inválido");
}

// ---------- Cortes ----------

export interface GuardarCorteInput {
  fecha: string;
  turno: TurnoCaja;
  saldoInicialEfectivo: number;
  saldoInicialTransferencia: number;
  cerrado: boolean;
  contadoEfectivo: number | null;
  contadoTransferencia: number | null;
}

export async function guardarCorteAction(i: GuardarCorteInput): Promise<void> {
  const perfil = await requerirPerfil(["dueno"]);
  if (!esFechaValida(i.fecha)) throw new Error("Fecha inválida");
  turnoValido(i.turno);
  if (!Number.isFinite(i.saldoInicialEfectivo) || !Number.isFinite(i.saldoInicialTransferencia)) {
    throw new Error("Saldo inicial inválido");
  }
  if (i.cerrado) {
    if (i.contadoEfectivo === null) throw new Error("Para cerrar el corte cargá el monto contado");
    noNegativo(i.contadoEfectivo, "El monto contado");
  }
  if (i.contadoTransferencia !== null) noNegativo(i.contadoTransferencia, "El saldo del banco");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cortes_caja").upsert(
    {
      fecha: i.fecha,
      turno: i.turno,
      saldo_inicial: i.saldoInicialEfectivo,
      saldo_inicial_transferencia: i.saldoInicialTransferencia,
      cerrado: i.cerrado,
      monto_contado: i.cerrado ? i.contadoEfectivo : null,
      monto_contado_transferencia: i.cerrado ? i.contadoTransferencia : null,
      cerrado_por: i.cerrado ? perfil.id : null,
      cerrado_en: i.cerrado ? new Date().toISOString() : null,
    },
    { onConflict: "fecha,turno" }
  );
  if (error) throw new Error(`Error al guardar el corte: ${error.message}`);
}

// ---------- Movimientos sueltos de la caja ----------

export async function agregarMovimientoCajaDiaAction(i: {
  fecha: string;
  turno: TurnoCaja;
  concepto: string;
  monto: number; // con signo
  medioPago: MedioPago;
}): Promise<void> {
  const perfil = await requerirPerfil(["dueno"]);
  if (!esFechaValida(i.fecha)) throw new Error("Fecha inválida");
  turnoValido(i.turno);
  if (!Number.isFinite(i.monto) || i.monto === 0) throw new Error("El monto tiene que ser distinto de cero");
  const concepto = i.concepto.trim();
  if (!concepto) throw new Error("Falta el concepto");
  medio(i.medioPago, true);

  const corte = await obtenerOCrearCorte({ fecha: i.fecha, turno: i.turno });
  const { error } = await getSupabaseAdmin().from("movimientos_caja").insert({
    corte_id: corte.id,
    concepto,
    monto: i.monto,
    medio_pago: i.medioPago,
    creado_por: perfil.id,
  });
  if (error) throw new Error(`Error al agregar el movimiento: ${error.message}`);
}

export async function editarMovimientoCajaAction(i: {
  id: string;
  concepto: string;
  monto: number;
  medioPago: MedioPago;
}): Promise<void> {
  await requerirPerfil(["dueno"]);
  if (!Number.isFinite(i.monto) || i.monto === 0) throw new Error("El monto tiene que ser distinto de cero");
  const concepto = i.concepto.trim();
  if (!concepto) throw new Error("Falta el concepto");
  medio(i.medioPago, true);
  const { error } = await getSupabaseAdmin()
    .from("movimientos_caja")
    .update({ concepto, monto: i.monto, medio_pago: i.medioPago })
    .eq("id", i.id);
  if (error) throw new Error(`Error al editar el movimiento: ${error.message}`);
}

export async function borrarMovimientoCajaAction(id: string): Promise<void> {
  await requerirPerfil(["dueno"]);
  const { error } = await getSupabaseAdmin().from("movimientos_caja").delete().eq("id", id);
  if (error) throw new Error(`Error al borrar el movimiento: ${error.message}`);
}

// ---------- Ventas de mostrador ----------

export async function agregarVentaMostradorDiaAction(i: {
  dia: string; // día en que se cobró (define la caja)
  turno: TurnoCaja; // Mediodía o Cierre de ese día
  fechaSorteo: string;
  monto: number;
  medioPago: MedioPago;
}): Promise<void> {
  const perfil = await requerirPerfil(["dueno"]);
  if (!esFechaValida(i.dia) || !esFechaValida(i.fechaSorteo)) throw new Error("Fecha inválida");
  turnoValido(i.turno);
  positivo(i.monto, "El monto");
  medio(i.medioPago, true);
  const hora = i.turno === "mediodia" ? "12:00" : "18:00";
  const { error } = await getSupabaseAdmin().from("ventas_mostrador").insert({
    fecha: i.fechaSorteo,
    monto: i.monto,
    medio_pago: i.medioPago,
    creado_por: perfil.id,
    creado_en: `${i.dia}T${hora}:00-03:00`,
  });
  if (error) throw new Error(`Error al agregar la venta: ${error.message}`);
}

export async function editarVentaMostradorAction(i: {
  id: string;
  monto: number;
  medioPago: MedioPago;
  fechaSorteo: string;
}): Promise<void> {
  await requerirPerfil(["dueno"]);
  if (!esFechaValida(i.fechaSorteo)) throw new Error("Fecha inválida");
  positivo(i.monto, "El monto");
  medio(i.medioPago, true);
  const { error } = await getSupabaseAdmin()
    .from("ventas_mostrador")
    .update({ monto: i.monto, medio_pago: i.medioPago, fecha: i.fechaSorteo })
    .eq("id", i.id);
  if (error) throw new Error(`Error al editar la venta: ${error.message}`);
}

export async function borrarVentaMostradorAction(id: string): Promise<void> {
  await requerirPerfil(["dueno"]);
  const { error } = await getSupabaseAdmin().from("ventas_mostrador").delete().eq("id", id);
  if (error) throw new Error(`Error al borrar la venta: ${error.message}`);
}

// ---------- Cobros de deuda (movimientos de cuenta corriente) ----------

export async function editarCobroDeudaAction(i: {
  id: string;
  monto: number;
  medioPago: MedioPago;
}): Promise<void> {
  await requerirPerfil(["dueno"]);
  positivo(i.monto, "El monto");
  medio(i.medioPago, true);
  const { error } = await getSupabaseAdmin()
    .from("movimientos_cliente")
    .update({ monto: -i.monto, medio_pago: i.medioPago })
    .eq("id", i.id)
    .eq("cobro_deuda", true);
  if (error) throw new Error(`Error al editar el cobro: ${error.message}`);
}

// Borrar el cobro devuelve la deuda al cliente (el saldo es la suma de sus movimientos).
export async function borrarCobroDeudaAction(id: string): Promise<void> {
  await requerirPerfil(["dueno"]);
  const { error } = await getSupabaseAdmin()
    .from("movimientos_cliente")
    .delete()
    .eq("id", id)
    .eq("cobro_deuda", true);
  if (error) throw new Error(`Error al borrar el cobro: ${error.message}`);
}

// ---------- Jugadas de clientes ----------

// Si la jugada es fiada tiene un movimiento de deuda enlazado: se mantiene en
// sincronía (se crea, actualiza o borra) para que la cuenta corriente cuadre.
export async function editarJugadaAction(i: {
  id: string;
  juego: Juego;
  importe: number;
  fiado: boolean;
  medioPago: MedioPago | null;
  fechaSorteo: string;
}): Promise<void> {
  const perfil = await requerirPerfil(["dueno"]);
  juego(i.juego);
  positivo(i.importe, "El importe");
  if (!esFechaValida(i.fechaSorteo)) throw new Error("Fecha del sorteo inválida");
  const mp = i.fiado ? null : medio(i.medioPago, true);

  const supabase = getSupabaseAdmin();
  const { data: actual, error: e0 } = await supabase
    .from("jugadas_clientes")
    .select("cliente_id, movimiento_id")
    .eq("id", i.id)
    .single();
  if (e0) throw new Error(`Error al leer la jugada: ${e0.message}`);

  let movimientoId: string | null = actual.movimiento_id;
  const concepto = `Jugada (${JUEGO_LABEL[i.juego]})`;

  if (i.fiado) {
    if (movimientoId) {
      const { error } = await supabase
        .from("movimientos_cliente")
        .update({ monto: i.importe, concepto })
        .eq("id", movimientoId);
      if (error) throw new Error(`Error al actualizar la deuda: ${error.message}`);
    } else {
      const { data: mov, error } = await supabase
        .from("movimientos_cliente")
        .insert({ cliente_id: actual.cliente_id, monto: i.importe, concepto, creado_por: perfil.id })
        .select("id")
        .single();
      if (error) throw new Error(`Error al registrar la deuda: ${error.message}`);
      movimientoId = mov.id;
    }
  } else if (movimientoId) {
    // Ya no es fiada: se saca del movimiento de deuda (primero se desenlaza).
    await supabase.from("jugadas_clientes").update({ movimiento_id: null }).eq("id", i.id);
    await supabase.from("movimientos_cliente").delete().eq("id", movimientoId);
    movimientoId = null;
  }

  const { error } = await supabase
    .from("jugadas_clientes")
    .update({
      juego: i.juego,
      descripcion: JUEGO_LABEL[i.juego],
      importe: i.importe,
      fiado: i.fiado,
      medio_pago: mp,
      fecha: i.fechaSorteo,
      movimiento_id: movimientoId,
    })
    .eq("id", i.id);
  if (error) throw new Error(`Error al editar la jugada: ${error.message}`);
}

export async function borrarJugadaAction(id: string): Promise<void> {
  await requerirPerfil(["dueno"]);
  const supabase = getSupabaseAdmin();
  const { data: j } = await supabase.from("jugadas_clientes").select("movimiento_id").eq("id", id).single();
  const { error } = await supabase.from("jugadas_clientes").delete().eq("id", id);
  if (error) throw new Error(`Error al borrar la jugada: ${error.message}`);
  if (j?.movimiento_id) await supabase.from("movimientos_cliente").delete().eq("id", j.movimiento_id);
}

// ---------- Premios de clientes ----------

export async function editarPremioAction(i: {
  id: string;
  monto: number;
  pagado: boolean;
  medioPago: MedioPago | null;
  fechaSorteo: string;
}): Promise<void> {
  const perfil = await requerirPerfil(["dueno"]);
  positivo(i.monto, "El monto");
  if (!esFechaValida(i.fechaSorteo)) throw new Error("Fecha del sorteo inválida");
  const mp = i.pagado ? medio(i.medioPago, true) : null;

  const supabase = getSupabaseAdmin();
  const { data: actual, error: e0 } = await supabase
    .from("premios_clientes")
    .select("cliente_id, juego, descripcion, movimiento_id")
    .eq("id", i.id)
    .single();
  if (e0) throw new Error(`Error al leer el premio: ${e0.message}`);

  let movimientoId: string | null = actual.movimiento_id;
  const concepto = `Premio (${JUEGO_LABEL[actual.juego as Juego]}): ${actual.descripcion}`;

  if (!i.pagado) {
    // Le debo el premio: movimiento negativo en su cuenta corriente.
    if (movimientoId) {
      const { error } = await supabase.from("movimientos_cliente").update({ monto: -i.monto }).eq("id", movimientoId);
      if (error) throw new Error(`Error al actualizar la deuda: ${error.message}`);
    } else {
      const { data: mov, error } = await supabase
        .from("movimientos_cliente")
        .insert({ cliente_id: actual.cliente_id, monto: -i.monto, concepto, creado_por: perfil.id })
        .select("id")
        .single();
      if (error) throw new Error(`Error al registrar la deuda: ${error.message}`);
      movimientoId = mov.id;
    }
  } else if (movimientoId) {
    await supabase.from("premios_clientes").update({ movimiento_id: null }).eq("id", i.id);
    await supabase.from("movimientos_cliente").delete().eq("id", movimientoId);
    movimientoId = null;
  }

  const { error } = await supabase
    .from("premios_clientes")
    .update({
      monto: i.monto,
      pagado: i.pagado,
      medio_pago: mp,
      fecha_sorteo: i.fechaSorteo,
      movimiento_id: movimientoId,
    })
    .eq("id", i.id);
  if (error) throw new Error(`Error al editar el premio: ${error.message}`);
}

export async function borrarPremioAction(id: string): Promise<void> {
  await requerirPerfil(["dueno"]);
  const supabase = getSupabaseAdmin();
  const { data: p } = await supabase.from("premios_clientes").select("movimiento_id").eq("id", id).single();
  const { error } = await supabase.from("premios_clientes").delete().eq("id", id);
  if (error) throw new Error(`Error al borrar el premio: ${error.message}`);
  if (p?.movimiento_id) await supabase.from("movimientos_cliente").delete().eq("id", p.movimiento_id);
}
