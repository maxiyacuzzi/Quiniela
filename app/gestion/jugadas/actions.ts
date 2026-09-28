"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requerirPerfil } from "@/lib/perfil";
import { Juego, JUEGO_LABEL, JUEGOS } from "@/lib/actividad-clientes";
import { MedioPago, MEDIOS_PAGO } from "@/lib/medios-pago";
import { esFechaValida } from "@/lib/fechas";

function validarJuego(juego: Juego) {
  if (!JUEGOS.includes(juego)) throw new Error("Juego inválido");
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
  medioPago: MedioPago | null; // solo si pagado (se pagó en el momento)
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
  if (input.pagado && !MEDIOS_PAGO.includes(input.medioPago as MedioPago)) {
    throw new Error("Falta el medio de pago");
  }

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

  let movimientoId: string | null = null;
  if (!input.pagado) {
    const { data: mov, error: errorMov } = await supabase
      .from("movimientos_cliente")
      .insert({
        cliente_id: input.clienteId,
        monto: -input.monto,
        concepto: `Premio (${JUEGO_LABEL[input.juego]}): ${descripcion}`,
        creado_por: perfil.id,
      })
      .select("id")
      .single();
    if (errorMov) throw new Error(`Error al registrar la deuda: ${errorMov.message}`);
    movimientoId = mov.id;
  }

  const { error } = await supabase.from("premios_clientes").insert({
    cliente_id: input.clienteId,
    juego: input.juego,
    descripcion,
    monto: input.monto,
    pagado: input.pagado,
    medio_pago: input.pagado ? input.medioPago : null,
    movimiento_id: movimientoId,
    jugada_id: input.jugadaId ?? null,
    fecha_sorteo: fechaSorteo,
    creado_por: perfil.id,
  });

  if (error) throw new Error(`Error al cargar el premio: ${error.message}`);
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
