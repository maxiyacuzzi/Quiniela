"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requerirPerfil } from "@/lib/perfil";
import {
  obtenerCorte,
  abrirCorte,
  getUltimoMontoInicialEfectivo,
  IdentificadorCorte,
  CorteCaja,
  TurnoCaja,
  puedeCerrarseConConteo,
} from "@/lib/caja";
import { getLiquidacionDia, LiquidacionDia } from "@/lib/liquidacion";
import { esFechaValida } from "@/lib/fechas";
import { MedioPago, MEDIOS_PAGO } from "@/lib/medios-pago";

function validarIdentificador(id: IdentificadorCorte) {
  if (!esFechaValida(id.fecha)) throw new Error("Fecha inválida");
  if (id.turno !== "mediodia" && id.turno !== "cierre") throw new Error("Turno inválido");
}

export async function obtenerCorteAction(fecha: string, turno: TurnoCaja): Promise<CorteCaja> {
  await requerirPerfil();
  const id = { fecha, turno };
  validarIdentificador(id);

  return obtenerCorte(id);
}

// Solo el dueño abre un turno: ahí define el fondo fijo con el que arranca
// la caja en efectivo (ya no se hereda del corte anterior).
export async function abrirCorteAction(
  fecha: string,
  turno: TurnoCaja,
  montoInicialEfectivo: number
): Promise<CorteCaja> {
  const perfil = await requerirPerfil(["dueno"]);
  const id = { fecha, turno };
  validarIdentificador(id);
  if (!Number.isFinite(montoInicialEfectivo) || montoInicialEfectivo < 0) {
    throw new Error("El monto inicial tiene que ser 0 o más");
  }

  return abrirCorte(id, montoInicialEfectivo, perfil.id);
}

// Sugerencia para el formulario de abrir turno: el último monto inicial que
// se usó (cualquier perfil lo puede ver, es solo informativo).
export async function obtenerUltimoMontoInicialAction(): Promise<number> {
  await requerirPerfil();
  return getUltimoMontoInicialEfectivo();
}

async function requerirCorteAbierto(corteId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cortes_caja")
    .select("cerrado")
    .eq("id", corteId)
    .single();
  if (error) throw new Error(`Error al leer el corte: ${error.message}`);
  if (data.cerrado) throw new Error("Este corte ya está cerrado");
}

// No deja cerrar CONTANDO plata un corte de un día que ya pasó (ver
// puedeCerrarseConConteo): la plata física ya se mezcló con la de hoy.
async function requerirPuedeCerrarseConConteo(corteId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cortes_caja")
    .select("fecha")
    .eq("id", corteId)
    .single();
  if (error) throw new Error(`Error al leer el corte: ${error.message}`);
  if (!puedeCerrarseConConteo(data.fecha)) {
    throw new Error(
      "Este corte quedó sin cerrar y ya pasó el día: la plata ya se mezcló con la de hoy, así que no se puede contar. Se sigue solo con lo esperado."
    );
  }
}

export interface AgregarMovimientoCajaInput {
  corteId: string;
  concepto: string;
  monto: number; // positivo: ingreso extra. negativo: gasto/egreso.
  medioPago: MedioPago;
}

export async function agregarMovimientoCajaAction(input: AgregarMovimientoCajaInput): Promise<void> {
  const perfil = await requerirPerfil();
  await requerirCorteAbierto(input.corteId);

  const concepto = input.concepto.trim();
  if (!concepto) throw new Error("Falta el concepto");
  if (!Number.isFinite(input.monto) || input.monto === 0) {
    throw new Error("El monto tiene que ser distinto de cero");
  }
  if (!MEDIOS_PAGO.includes(input.medioPago)) throw new Error("Medio de pago inválido");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("movimientos_caja").insert({
    corte_id: input.corteId,
    concepto,
    monto: input.monto,
    medio_pago: input.medioPago,
    creado_por: perfil.id,
  });
  if (error) throw new Error(`Error al agregar el movimiento: ${error.message}`);
}

// Solo el dueño cierra la caja: una vez cerrado define el saldo con el que
// arranca el corte siguiente, y los empleados no deberían poder dejarlo mal.
export async function cerrarCorteAction(
  corteId: string,
  montoContado: number,
  montoContadoTransferencia: number | null // saldo real del banco, opcional
): Promise<void> {
  const perfil = await requerirPerfil(["dueno"]);
  if (!Number.isFinite(montoContado) || montoContado < 0) {
    throw new Error("El monto contado tiene que ser 0 o más");
  }
  if (
    montoContadoTransferencia !== null &&
    (!Number.isFinite(montoContadoTransferencia) || montoContadoTransferencia < 0)
  ) {
    throw new Error("El saldo del banco tiene que ser 0 o más");
  }
  await requerirCorteAbierto(corteId);
  await requerirPuedeCerrarseConConteo(corteId);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("cortes_caja")
    .update({
      cerrado: true,
      monto_contado: montoContado,
      monto_contado_transferencia: montoContadoTransferencia,
      cerrado_por: perfil.id,
      cerrado_en: new Date().toISOString(),
    })
    .eq("id", corteId);
  if (error) throw new Error(`Error al cerrar el corte: ${error.message}`);
}

// Solo el dueño puede reabrir un corte ya cerrado (por si hubo un error de
// carga) — reabrirlo no toca los cortes posteriores, que ya heredaron el
// saldo con el que se cerró en ese momento.
export async function reabrirCorteAction(corteId: string): Promise<void> {
  await requerirPerfil(["dueno"]);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("cortes_caja")
    .update({
      cerrado: false,
      monto_contado: null,
      monto_contado_transferencia: null,
      cerrado_por: null,
      cerrado_en: null,
    })
    .eq("id", corteId);
  if (error) throw new Error(`Error al reabrir el corte: ${error.message}`);
}

// Solo el dueño ve la liquidación con la lotería y la cuenta de premios.
export async function obtenerLiquidacionDiaAction(fecha: string): Promise<LiquidacionDia> {
  await requerirPerfil(["dueno"]);
  if (!esFechaValida(fecha)) throw new Error("Fecha inválida");
  return getLiquidacionDia(fecha);
}

export interface CobrarDeudaClienteInput {
  clienteId: string;
  monto: number;
  medioPago: MedioPago;
}

// Un cliente paga plata que debía: baja su saldo (movimiento negativo en la
// cuenta corriente) y, como queda marcado cobro_deuda, la Caja lo suma sola
// según el medio de pago, en el corte de cuando se cobró.
export async function cobrarDeudaClienteAction(input: CobrarDeudaClienteInput): Promise<void> {
  const perfil = await requerirPerfil();

  if (!Number.isFinite(input.monto) || input.monto <= 0) {
    throw new Error("El monto tiene que ser mayor a 0");
  }
  if (!MEDIOS_PAGO.includes(input.medioPago)) throw new Error("Medio de pago inválido");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("movimientos_cliente").insert({
    cliente_id: input.clienteId,
    monto: -input.monto,
    concepto: "Cobro de deuda",
    medio_pago: input.medioPago,
    cobro_deuda: true,
    creado_por: perfil.id,
  });
  if (error) throw new Error(`Error al registrar el cobro: ${error.message}`);
}

export interface AgregarMovimientoCuentaPremiosInput {
  fecha: string;
  monto: number; // positivo: depósito de la Quiniela de Córdoba. negativo: retiro/pago.
  concepto: string;
}

// Cuenta de premios (Córdoba): completamente independiente de la caja y de
// los premios de clientes — un librito aparte con saldo acumulado real.
export async function agregarMovimientoCuentaPremiosAction(
  input: AgregarMovimientoCuentaPremiosInput
): Promise<void> {
  const perfil = await requerirPerfil(["dueno"]);

  if (!esFechaValida(input.fecha)) throw new Error("Fecha inválida");
  if (!Number.isFinite(input.monto) || input.monto === 0) {
    throw new Error("El monto tiene que ser distinto de cero");
  }
  const concepto = input.concepto.trim();
  if (!concepto) throw new Error("Falta el concepto");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cuenta_premios_movimientos").insert({
    fecha: input.fecha,
    monto: input.monto,
    concepto,
    creado_por: perfil.id,
  });
  if (error) throw new Error(`Error al agregar el movimiento: ${error.message}`);
}
