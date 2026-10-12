"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requerirPerfil } from "@/lib/perfil";
import {
  Juego,
  JUEGO_LABEL,
  JUEGOS,
  ActividadCliente,
  OpcionesActividad,
  listarActividadReciente,
} from "@/lib/actividad-clientes";
import { MedioPago, MEDIOS_PAGO, MedioPagoPremio, MEDIOS_PAGO_PREMIO } from "@/lib/medios-pago";
import { esFechaValida, getFechaHoyArgentina } from "@/lib/fechas";
import { obtenerCorte, turnoCajaActual, TURNO_CAJA_LABEL } from "@/lib/caja";
import { registrarRetiroPorPremio } from "@/lib/cuenta-general";

function validarJuego(juego: Juego) {
  if (!JUEGOS.includes(juego)) throw new Error("Juego inválido");
}

export interface PagoPremio {
  medioPago: MedioPagoPremio;
  montoEfectivo: number | null;
  montoTransferencia: number | null;
  montoCuenta: number | null; // si el cliente debía, esta parte cancela esa deuda (no es plata que entra a la caja)
}

// Para pagar un premio, además de efectivo/transferencia se puede elegir
// "cuenta" (si el cliente debía, se lo descuenta de ahí en vez de pagárselo
// en mano) o "mixto" (una combinación de las tres). Los montos tienen que
// sumar exactamente el total del premio — si no, no cuadraría en ninguna
// cuenta ni en la deuda.
function validarPagoPremio(
  monto: number,
  medioPago: MedioPagoPremio | null,
  montoEfectivo: number | undefined,
  montoTransferencia: number | undefined,
  montoCuenta: number | undefined
): PagoPremio {
  if (!medioPago || !MEDIOS_PAGO_PREMIO.includes(medioPago)) throw new Error("Falta el medio de pago");
  if (medioPago === "efectivo" || medioPago === "transferencia") {
    return { medioPago, montoEfectivo: null, montoTransferencia: null, montoCuenta: null };
  }
  if (medioPago === "cuenta") {
    return { medioPago, montoEfectivo: null, montoTransferencia: null, montoCuenta: monto };
  }

  // mixto: cualquier combinación de las tres, mientras sumen el total.
  const ef = montoEfectivo ?? 0;
  const tr = montoTransferencia ?? 0;
  const cta = montoCuenta ?? 0;
  for (const [campo, valor] of [
    ["efectivo", montoEfectivo],
    ["transferencia", montoTransferencia],
    ["a cuenta", montoCuenta],
  ] as const) {
    if (valor !== undefined && (!Number.isFinite(valor) || valor < 0)) {
      throw new Error(`El monto en ${campo} tiene que ser 0 o más`);
    }
  }
  if (ef + tr + cta !== monto) {
    throw new Error("El efectivo, la transferencia y lo aplicado a cuenta tienen que sumar el total del premio");
  }
  return { medioPago, montoEfectivo: ef, montoTransferencia: tr, montoCuenta: cta };
}

export interface CargarJugadaInput {
  clienteId: string;
  juego: Juego;
  monto: number;
  fechaSorteo: string; // para qué sorteo es (define la liquidación); la caja va por cuándo se cargó
  fiado: boolean;
  medioPago: MedioPago | null; // solo si !fiado (se cobró en el momento)
}

// No se registran los números jugados — solo cliente, tipo de juego y monto.
// Si tuvo premio, se carga aparte con cargarPremioAction, enlazado a esta
// jugada puntual (jugadaId).
export async function cargarJugadaAction(input: CargarJugadaInput): Promise<void> {
  const perfil = await requerirPerfil();
  validarJuego(input.juego);

  if (!esFechaValida(input.fechaSorteo)) throw new Error("Fecha del sorteo inválida");
  if (!Number.isFinite(input.monto) || input.monto <= 0) {
    throw new Error("El monto tiene que ser mayor a 0");
  }
  if (!input.fiado && !MEDIOS_PAGO.includes(input.medioPago as MedioPago)) {
    throw new Error("Falta el medio de pago");
  }

  const descripcion = JUEGO_LABEL[input.juego];
  const supabase = getSupabaseAdmin();

  let movimientoId: string | null = null;
  if (input.fiado) {
    const { data: mov, error: errorMov } = await supabase
      .from("movimientos_cliente")
      .insert({
        cliente_id: input.clienteId,
        monto: input.monto,
        concepto: `Jugada (${descripcion})`,
        creado_por: perfil.id,
      })
      .select("id")
      .single();
    if (errorMov) throw new Error(`Error al registrar la deuda: ${errorMov.message}`);
    movimientoId = mov.id;
  }

  const { error } = await supabase.from("jugadas_clientes").insert({
    cliente_id: input.clienteId,
    juego: input.juego,
    descripcion,
    importe: input.monto,
    fiado: input.fiado,
    medio_pago: input.fiado ? null : input.medioPago,
    movimiento_id: movimientoId,
    creado_por: perfil.id,
    fecha: input.fechaSorteo,
  });

  if (error) throw new Error(`Error al cargar la jugada: ${error.message}`);
}

export interface CargarPremioInput {
  clienteId: string;
  juego: Juego;
  descripcion: string;
  monto: number;
  pagado: boolean;
  medioPago: MedioPagoPremio | null; // solo si pagado (se pagó en el momento)
  montoEfectivo?: number; // solo si medioPago === "mixto"
  montoTransferencia?: number; // solo si medioPago === "mixto"
  montoCuenta?: number; // solo si medioPago === "mixto" (si es "cuenta" se usa el monto completo)
  jugadaId?: string; // si el premio viene de una jugada puntual ya cargada
  fechaSorteo?: string; // sorteo en que ganó; si viene de una jugada, hereda la de ella
}

export async function cargarPremioAction(input: CargarPremioInput): Promise<void> {
  const perfil = await requerirPerfil();
  validarJuego(input.juego);

  const descripcion = input.descripcion.trim();
  if (!descripcion) throw new Error("Falta la descripción");
  if (!Number.isFinite(input.monto) || input.monto <= 0) {
    throw new Error("El monto tiene que ser mayor a 0");
  }
  const pago = input.pagado
    ? validarPagoPremio(
        input.monto,
        input.medioPago,
        input.montoEfectivo,
        input.montoTransferencia,
        input.montoCuenta
      )
    : null;

  if (input.fechaSorteo !== undefined && !esFechaValida(input.fechaSorteo)) {
    throw new Error("Fecha del sorteo inválida");
  }

  const supabase = getSupabaseAdmin();

  // El premio se liquida en el sorteo en que ganó: si viene de una jugada, el
  // de esa jugada; si no, el que se indique (o el día de carga, si es null).
  let fechaSorteo: string | null = input.fechaSorteo ?? null;
  if (!fechaSorteo && input.jugadaId) {
    const { data: jugada } = await supabase
      .from("jugadas_clientes")
      .select("fecha")
      .eq("id", input.jugadaId)
      .maybeSingle();
    fechaSorteo = jugada?.fecha ?? null;
  }

  // Si todavía no se pagó nada, el premio entero queda como deuda nuestra
  // (a favor del cliente) hasta que se liquide. Si ya se pagó pero una parte
  // se aplicó "a cuenta", esa parte cancela lo que el cliente debía — mismo
  // tipo de movimiento, por el monto que corresponda.
  const montoACuentaCorriente = !input.pagado ? input.monto : (pago?.montoCuenta ?? 0);
  let movimientoId: string | null = null;
  if (montoACuentaCorriente > 0) {
    const concepto = `Premio (${JUEGO_LABEL[input.juego]}): ${descripcion}${
      input.pagado ? " — aplicado a su cuenta" : ""
    }`;
    const { data: mov, error: errorMov } = await supabase
      .from("movimientos_cliente")
      .insert({
        cliente_id: input.clienteId,
        monto: -montoACuentaCorriente,
        concepto,
        creado_por: perfil.id,
      })
      .select("id")
      .single();
    if (errorMov) throw new Error(`Error al registrar la deuda: ${errorMov.message}`);
    movimientoId = mov.id;
  }

  const { data: premio, error } = await supabase
    .from("premios_clientes")
    .insert({
      cliente_id: input.clienteId,
      juego: input.juego,
      descripcion,
      monto: input.monto,
      pagado: input.pagado,
      medio_pago: pago?.medioPago ?? null,
      monto_efectivo: pago?.montoEfectivo ?? null,
      monto_transferencia: pago?.montoTransferencia ?? null,
      monto_cuenta: pago?.montoCuenta ?? null,
      movimiento_id: movimientoId,
      jugada_id: input.jugadaId ?? null,
      fecha_sorteo: fechaSorteo,
      creado_por: perfil.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Error al cargar el premio: ${error.message}`);

  // Si lo que se pagó en efectivo supera lo que hay físicamente en el cajón
  // del turno actual, la diferencia sale sola de la cuenta general (la "caja
  // fuerte"): el cajero no tiene que improvisar con plata propia. Solo
  // aplica al turno en curso (no a correcciones de premios de otros días).
  const efectivoDelPago =
    !pago ? 0 : pago.medioPago === "efectivo" ? input.monto : (pago.montoEfectivo ?? 0);
  if (efectivoDelPago > 0) {
    const id = { fecha: getFechaHoyArgentina(), turno: turnoCajaActual() };
    const corteActual = await obtenerCorte(id);
    if (corteActual.existe && corteActual.montoEsperado < 0) {
      const faltante = -corteActual.montoEsperado;
      await supabase.from("movimientos_caja").insert({
        corte_id: corteActual.id,
        concepto: `Aporte desde la cuenta general (premio: ${descripcion})`,
        monto: faltante,
        medio_pago: "efectivo",
        creado_por: perfil.id,
      });
      await registrarRetiroPorPremio({
        corteId: corteActual.id,
        premioId: premio.id,
        monto: faltante,
        concepto: `Premio (${JUEGO_LABEL[input.juego]}): ${descripcion} — ${TURNO_CAJA_LABEL[id.turno]} ${id.fecha}`,
        creadoPor: perfil.id,
      });
    }
  }
}

export interface CargarVentaMostradorInput {
  fecha: string; // día del sorteo al que corresponde (no necesariamente hoy)
  monto: number;
  medioPago: MedioPago;
}

// Venta de mostrador: plata cobrada sin un cliente puntual (la mayoría de la
// quiniela vendida). Reemplaza el viejo campo manual "Ventas" de Caja — acá
// solo se carga fecha y monto, sin números. Caja la suma sola, siempre en el
// corte de Mediodía de esa fecha (ver lib/caja.ts).
export async function cargarVentaMostradorAction(input: CargarVentaMostradorInput): Promise<void> {
  const perfil = await requerirPerfil();

  if (!esFechaValida(input.fecha)) throw new Error("Fecha inválida");
  if (!Number.isFinite(input.monto) || input.monto <= 0) {
    throw new Error("El monto tiene que ser mayor a 0");
  }
  if (!MEDIOS_PAGO.includes(input.medioPago)) throw new Error("Medio de pago inválido");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("ventas_mostrador").insert({
    fecha: input.fecha,
    monto: input.monto,
    medio_pago: input.medioPago,
    creado_por: perfil.id,
  });

  if (error) throw new Error(`Error al cargar la venta: ${error.message}`);
}

// Para filtrar "Actividad reciente" por día/semana/mes: sin filtro trae lo
// último nomás, con filtro trae todo ese período (ver listarActividadReciente).
export async function obtenerActividadRecienteAction(
  opciones: OpcionesActividad = {}
): Promise<ActividadCliente[]> {
  await requerirPerfil();
  if (opciones.desde !== undefined && !esFechaValida(opciones.desde)) throw new Error("Fecha inválida");
  if (opciones.hasta !== undefined && !esFechaValida(opciones.hasta)) throw new Error("Fecha inválida");
  return listarActividadReciente(opciones);
}
