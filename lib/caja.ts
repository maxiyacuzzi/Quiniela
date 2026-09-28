import { getSupabaseAdmin } from "./supabase";
import { restarDias, sumarDias, getFechaHoyArgentina, getHoraActualArgentina } from "./fechas";
import { MedioPago } from "./medios-pago";

export type TurnoCaja = "mediodia" | "cierre";

export const TURNO_CAJA_LABEL: Record<TurnoCaja, string> = {
  mediodia: "Mediodía (Previa + Primera)",
  cierre: "Cierre (Matutina + Vespertina + Nocturna)",
};

// Hora de corte entre un turno de caja y el otro (aproximado: después de que
// se sabe el resultado de Primera y antes de que arranque la venta de la
// tarde). Se usa tanto para saber "en qué turno estamos parados hoy" como
// para calcular la referencia automática de Clientes.
const HORA_CORTE = 14;

export function turnoCajaActual(): TurnoCaja {
  return getHoraActualArgentina() < HORA_CORTE ? "mediodia" : "cierre";
}

export interface IdentificadorCorte {
  fecha: string;
  turno: TurnoCaja;
}

export function corteAnterior({ fecha, turno }: IdentificadorCorte): IdentificadorCorte {
  if (turno === "cierre") return { fecha, turno: "mediodia" };
  return { fecha: restarDias(fecha, 1), turno: "cierre" };
}

export function corteSiguiente({ fecha, turno }: IdentificadorCorte): IdentificadorCorte {
  if (turno === "mediodia") return { fecha, turno: "cierre" };
  return { fecha: sumarDias(fecha, 1), turno: "mediodia" };
}

// El corte "actual" es el último que tiene sentido operar: hoy, con el turno
// que corresponde según la hora. No se puede navegar a cortes futuros.
export function esCorteFuturo({ fecha, turno }: IdentificadorCorte): boolean {
  const hoy = getFechaHoyArgentina();
  if (fecha > hoy) return true;
  if (fecha < hoy) return false;
  return turno === "cierre" && turnoCajaActual() === "mediodia";
}

export interface MovimientoCaja {
  id: string;
  concepto: string;
  monto: number;
  medioPago: MedioPago;
  creadoPor: string | null;
  creadoEn: string;
}

// Jugadas/premios de clientes cobrados o pagados en el momento (no fiados),
// dentro de la ventana horaria de este corte — se suman/restan solas al
// total de caja, además de mostrarse como detalle.
export interface ReferenciaClientes {
  jugadasEfectivo: number;
  cantidadJugadasEfectivo: number;
  jugadasTransferencia: number;
  cantidadJugadasTransferencia: number;
  premiosEfectivo: number;
  cantidadPremiosEfectivo: number;
  premiosTransferencia: number;
  cantidadPremiosTransferencia: number;
  // Deudas de clientes cobradas en el turno (cuenta corriente): es plata que
  // entra al cajón / a transferencias aunque no sea una jugada nueva.
  cobrosEfectivo: number;
  cantidadCobrosEfectivo: number;
  cobrosTransferencia: number;
  cantidadCobrosTransferencia: number;
}

// Ventas de mostrador (sin cliente, cargadas en Jugadas con fecha del sorteo
// + monto) cobradas dentro de la ventana horaria de este corte.
export interface VentasMostrador {
  efectivo: number;
  cantidadEfectivo: number;
  transferencia: number;
  cantidadTransferencia: number;
}

export interface CorteCaja {
  id: string;
  fecha: string;
  turno: TurnoCaja;
  saldoInicial: number;
  saldoInicialTransferencia: number; // heredado del corte anterior
  cerrado: boolean;
  montoContado: number | null;
  montoContadoTransferencia: number | null; // saldo real del banco al cerrar (opcional)
  cerradoPor: string | null;
  movimientos: MovimientoCaja[];
  referencia: ReferenciaClientes;
  ventasMostrador: VentasMostrador;
  montoEsperado: number; // efectivo físico esperado en el cajón
  totalTransferencias: number; // saldo esperado en la cuenta de transferencias (acumulado)
}

// El efectivo físico esperado en el cajón: saldo inicial, más lo cobrado en
// efectivo (ventas de mostrador + jugadas de clientes), menos lo pagado en
// efectivo (premios de clientes), más movimientos sueltos en efectivo.
function calcularMontoEsperado(c: {
  saldoInicial: number;
  movimientos: { monto: number; medioPago: MedioPago }[];
  referencia: ReferenciaClientes;
  ventasMostrador: VentasMostrador;
}): number {
  const sumaMovimientos = c.movimientos
    .filter((m) => m.medioPago === "efectivo")
    .reduce((acc, m) => acc + m.monto, 0);
  return (
    c.saldoInicial +
    c.ventasMostrador.efectivo +
    c.referencia.jugadasEfectivo +
    c.referencia.cobrosEfectivo -
    c.referencia.premiosEfectivo +
    sumaMovimientos
  );
}

// Saldo esperado en la cuenta de transferencias: como una cuenta bancaria, se
// arrastra de un corte al siguiente (saldo heredado + lo que entró - lo que salió).
function calcularTotalTransferencias(c: {
  saldoInicialTransferencia: number;
  movimientos: { monto: number; medioPago: MedioPago }[];
  referencia: ReferenciaClientes;
  ventasMostrador: VentasMostrador;
}): number {
  const sumaMovimientos = c.movimientos
    .filter((m) => m.medioPago === "transferencia")
    .reduce((acc, m) => acc + m.monto, 0);
  return (
    c.saldoInicialTransferencia +
    c.ventasMostrador.transferencia +
    c.referencia.jugadasTransferencia +
    c.referencia.cobrosTransferencia -
    c.referencia.premiosTransferencia +
    sumaMovimientos
  );
}

// Cuánto de lo cargado en "Jugadas" (jugadas no fiadas + premios pagados) cae
// dentro de la ventana horaria de este corte, separado por medio de pago.
// Ventana horaria del corte, según cuándo se cargó (= cuándo entró/salió la
// plata). Es lo que define en qué caja se cuenta, sin importar para qué
// sorteo sea la jugada.
function ventanaCorte(id: IdentificadorCorte): { desde: string; hasta: string } {
  const corte = `${String(HORA_CORTE).padStart(2, "0")}:00:00-03:00`;
  return id.turno === "mediodia"
    ? { desde: `${id.fecha}T00:00:00-03:00`, hasta: `${id.fecha}T${corte}` }
    : { desde: `${id.fecha}T${corte}`, hasta: `${sumarDias(id.fecha, 1)}T00:00:00-03:00` };
}

async function getReferenciaClientes(id: IdentificadorCorte): Promise<ReferenciaClientes> {
  const supabase = getSupabaseAdmin();
  const { desde, hasta } = ventanaCorte(id);

  const [jugadasRes, cobrosRes, premiosRes] = await Promise.all([
    supabase
      .from("jugadas_clientes")
      .select("importe, medio_pago")
      .eq("fiado", false)
      .gte("creado_en", desde)
      .lt("creado_en", hasta),
    supabase
      .from("movimientos_cliente")
      .select("monto, medio_pago")
      .eq("cobro_deuda", true)
      .gte("creado_en", desde)
      .lt("creado_en", hasta),
    supabase
      .from("premios_clientes")
      .select("monto, medio_pago")
      .eq("pagado", true)
      .gte("creado_en", desde)
      .lt("creado_en", hasta),
  ]);

  if (jugadasRes.error) throw new Error(`Error al leer jugadas: ${jugadasRes.error.message}`);
  if (premiosRes.error) throw new Error(`Error al leer premios: ${premiosRes.error.message}`);
  if (cobrosRes.error) throw new Error(`Error al leer cobros de deuda: ${cobrosRes.error.message}`);

  const jugadas = jugadasRes.data ?? [];
  const cobros = cobrosRes.data ?? [];
  const cobrosEfectivo = cobros.filter((c) => c.medio_pago === "efectivo");
  const cobrosTransferencia = cobros.filter((c) => c.medio_pago === "transferencia");
  const premios = premiosRes.data ?? [];

  const jugadasEfectivo = jugadas.filter((j) => j.medio_pago === "efectivo");
  const jugadasTransferencia = jugadas.filter((j) => j.medio_pago === "transferencia");
  const premiosEfectivo = premios.filter((p) => p.medio_pago === "efectivo");
  const premiosTransferencia = premios.filter((p) => p.medio_pago === "transferencia");

  return {
    jugadasEfectivo: jugadasEfectivo.reduce((acc, j) => acc + Number(j.importe), 0),
    cantidadJugadasEfectivo: jugadasEfectivo.length,
    jugadasTransferencia: jugadasTransferencia.reduce((acc, j) => acc + Number(j.importe), 0),
    cantidadJugadasTransferencia: jugadasTransferencia.length,
    premiosEfectivo: premiosEfectivo.reduce((acc, p) => acc + Number(p.monto), 0),
    cantidadPremiosEfectivo: premiosEfectivo.length,
    premiosTransferencia: premiosTransferencia.reduce((acc, p) => acc + Number(p.monto), 0),
    cantidadPremiosTransferencia: premiosTransferencia.length,
    // el cobro se guarda como movimiento negativo (baja la deuda): en caja suma
    cobrosEfectivo: cobrosEfectivo.reduce((acc, c) => acc + Math.abs(Number(c.monto)), 0),
    cantidadCobrosEfectivo: cobrosEfectivo.length,
    cobrosTransferencia: cobrosTransferencia.reduce((acc, c) => acc + Math.abs(Number(c.monto)), 0),
    cantidadCobrosTransferencia: cobrosTransferencia.length,
  };
}

// Las ventas de mostrador se cuentan en la caja del momento en que se cobraron
// (creado_en), no de la fecha del sorteo: una venta cobrada hoy para mañana
// ya está en el cajón hoy. La fecha del sorteo solo decide en qué liquidación
// entra (ver lib/liquidacion.ts).
async function getVentasMostrador(id: IdentificadorCorte): Promise<VentasMostrador> {
  const supabase = getSupabaseAdmin();
  const { desde, hasta } = ventanaCorte(id);
  const { data, error } = await supabase
    .from("ventas_mostrador")
    .select("monto, medio_pago")
    .gte("creado_en", desde)
    .lt("creado_en", hasta);

  if (error) throw new Error(`Error al leer las ventas de mostrador: ${error.message}`);

  const filas = data ?? [];
  const efectivo = filas.filter((f) => f.medio_pago === "efectivo");
  const transferencia = filas.filter((f) => f.medio_pago === "transferencia");

  return {
    efectivo: efectivo.reduce((acc, f) => acc + Number(f.monto), 0),
    cantidadEfectivo: efectivo.length,
    transferencia: transferencia.reduce((acc, f) => acc + Number(f.monto), 0),
    cantidadTransferencia: transferencia.length,
  };
}

export interface FilaCorteDB {
  fecha: string;
  turno: TurnoCaja;
  saldo_inicial: number;
  saldo_inicial_transferencia: number;
  cerrado: boolean;
  monto_contado: number | null;
  monto_contado_transferencia: number | null;
  movimientos_caja: { monto: number; medio_pago: string }[] | null;
}

export const SELECT_FILA_CORTE =
  "fecha, turno, saldo_inicial, saldo_inicial_transferencia, cerrado, monto_contado, monto_contado_transferencia, movimientos_caja(monto, medio_pago)";

const ORDEN_TURNO: Record<TurnoCaja, number> = { mediodia: 0, cierre: 1 };

function compararCortes(a: IdentificadorCorte, b: IdentificadorCorte): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
  return ORDEN_TURNO[a.turno] - ORDEN_TURNO[b.turno];
}

// Un corte calculado solo para lectura: entradas y salidas de cada cuenta.
export interface CorteCalculado {
  saldoInicialEfectivo: number;
  ingresosEfectivo: number;
  egresosEfectivo: number;
  esperadoEfectivo: number;
  saldoInicialTransferencia: number;
  ingresosTransferencia: number;
  egresosTransferencia: number;
  esperadoTransferencia: number;
  cerrado: boolean;
  contadoEfectivo: number | null;
  contadoTransferencia: number | null;
}

// Calcula un corte sin escribir nada. Si el corte tiene fila usa sus saldos
// iniciales guardados; si nunca se abrió ("virtual"), hereda del anterior.
export async function calcularCorteLectura(
  id: IdentificadorCorte,
  fila: FilaCorteDB | null,
  previo: { efectivo: number; transferencia: number }
): Promise<CorteCalculado> {
  const [referencia, ventasMostrador] = await Promise.all([
    getReferenciaClientes(id),
    getVentasMostrador(id),
  ]);
  const movimientos = (fila?.movimientos_caja ?? []).map((m) => ({
    monto: Number(m.monto),
    medioPago: m.medio_pago as MedioPago,
  }));
  const movEf = movimientos.filter((m) => m.medioPago === "efectivo");
  const movTr = movimientos.filter((m) => m.medioPago === "transferencia");
  const suma = (xs: { monto: number }[], signo: 1 | -1) =>
    xs.filter((m) => m.monto * signo > 0).reduce((acc, m) => acc + Math.abs(m.monto), 0);

  const saldoInicialEfectivo = fila ? Number(fila.saldo_inicial) : previo.efectivo;
  const saldoInicialTransferencia = fila
    ? Number(fila.saldo_inicial_transferencia)
    : previo.transferencia;

  const ingresosEfectivo =
    ventasMostrador.efectivo + referencia.jugadasEfectivo + referencia.cobrosEfectivo + suma(movEf, 1);
  const egresosEfectivo = referencia.premiosEfectivo + suma(movEf, -1);
  const ingresosTransferencia =
    ventasMostrador.transferencia +
    referencia.jugadasTransferencia +
    referencia.cobrosTransferencia +
    suma(movTr, 1);
  const egresosTransferencia = referencia.premiosTransferencia + suma(movTr, -1);

  return {
    saldoInicialEfectivo,
    ingresosEfectivo,
    egresosEfectivo,
    esperadoEfectivo: saldoInicialEfectivo + ingresosEfectivo - egresosEfectivo,
    saldoInicialTransferencia,
    ingresosTransferencia,
    egresosTransferencia,
    esperadoTransferencia: saldoInicialTransferencia + ingresosTransferencia - egresosTransferencia,
    cerrado: fila?.cerrado ?? false,
    contadoEfectivo: fila?.monto_contado == null ? null : Number(fila.monto_contado),
    contadoTransferencia:
      fila?.monto_contado_transferencia == null ? null : Number(fila.monto_contado_transferencia),
  };
}

// Con qué saldo cierra un corte (lo que hereda el siguiente): lo contado si ya
// se cerró, o lo esperado.
export function saldoDeCierre(c: CorteCalculado): { efectivo: number; transferencia: number } {
  return {
    efectivo: c.cerrado && c.contadoEfectivo !== null ? c.contadoEfectivo : c.esperadoEfectivo,
    transferencia:
      c.cerrado && c.contadoTransferencia !== null ? c.contadoTransferencia : c.esperadoTransferencia,
  };
}

// Saldos con los que cierra el corte `id`. Parte del último corte que existe
// hasta ese momento y avanza corte por corte: los cortes que nadie llegó a abrir
// se calculan solos, así un hueco en el medio no reinicia los saldos a $0.
export async function getSaldoDeCierre(
  id: IdentificadorCorte
): Promise<{ efectivo: number; transferencia: number }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cortes_caja")
    .select(SELECT_FILA_CORTE)
    .lte("fecha", id.fecha)
    .order("fecha", { ascending: false })
    .limit(6);

  if (error) throw new Error(`Error al leer los cortes anteriores: ${error.message}`);

  const base = ((data ?? []) as unknown as FilaCorteDB[])
    .filter((f) => compararCortes(f, id) <= 0)
    .sort((a, b) => compararCortes(b, a))[0];
  if (!base) return { efectivo: 0, transferencia: 0 }; // no hay ningún corte (ej. es el primero de todos)

  let cursor: IdentificadorCorte = { fecha: base.fecha, turno: base.turno };
  let saldo = saldoDeCierre(await calcularCorteLectura(cursor, base, { efectivo: 0, transferencia: 0 }));

  for (let pasos = 0; compararCortes(cursor, id) < 0 && pasos < 800; pasos++) {
    cursor = corteSiguiente(cursor);
    saldo = saldoDeCierre(await calcularCorteLectura(cursor, null, saldo));
  }
  return saldo;
}

// Trae el corte de esa fecha/turno, creándolo (con el saldo heredado del
// corte anterior) si todavía no existe.
export async function obtenerOCrearCorte(id: IdentificadorCorte): Promise<CorteCaja> {
  const supabase = getSupabaseAdmin();

  const { data: existente, error } = await supabase
    .from("cortes_caja")
    .select(
      "id, fecha, turno, saldo_inicial, saldo_inicial_transferencia, cerrado, monto_contado, monto_contado_transferencia, perfiles(nombre), movimientos_caja(id, concepto, monto, medio_pago, creado_en, perfiles(nombre))"
    )
    .eq("fecha", id.fecha)
    .eq("turno", id.turno)
    .maybeSingle();

  if (error) throw new Error(`Error al leer el corte de caja: ${error.message}`);

  const [referencia, ventasMostrador] = await Promise.all([
    getReferenciaClientes(id),
    getVentasMostrador(id),
  ]);

  if (existente) {
    const movimientos: MovimientoCaja[] = (
      (existente.movimientos_caja ?? []) as unknown as {
        id: string;
        concepto: string;
        monto: number;
        medio_pago: string;
        creado_en: string;
        perfiles: { nombre: string } | null;
      }[]
    )
      .map((m) => ({
        id: m.id,
        concepto: m.concepto,
        monto: Number(m.monto),
        medioPago: m.medio_pago as MedioPago,
        creadoPor: m.perfiles?.nombre ?? null,
        creadoEn: m.creado_en,
      }))
      .sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));

    const corte: CorteCaja = {
      id: existente.id,
      fecha: existente.fecha,
      turno: existente.turno as TurnoCaja,
      saldoInicial: Number(existente.saldo_inicial),
      saldoInicialTransferencia: Number(existente.saldo_inicial_transferencia),
      cerrado: existente.cerrado,
      montoContado: existente.monto_contado === null ? null : Number(existente.monto_contado),
      montoContadoTransferencia:
        existente.monto_contado_transferencia === null
          ? null
          : Number(existente.monto_contado_transferencia),
      cerradoPor: (existente.perfiles as unknown as { nombre: string } | null)?.nombre ?? null,
      movimientos,
      referencia,
      ventasMostrador,
      montoEsperado: 0,
      totalTransferencias: 0,
    };
    corte.montoEsperado = calcularMontoEsperado(corte);
    corte.totalTransferencias = calcularTotalTransferencias(corte);
    return corte;
  }

  const saldos = await getSaldoDeCierre(corteAnterior(id));

  const { data: creado, error: errorCrear } = await supabase
    .from("cortes_caja")
    .insert({
      fecha: id.fecha,
      turno: id.turno,
      saldo_inicial: saldos.efectivo,
      saldo_inicial_transferencia: saldos.transferencia,
    })
    .select("id")
    .single();

  if (errorCrear) throw new Error(`Error al crear el corte de caja: ${errorCrear.message}`);

  const corte: CorteCaja = {
    id: creado.id,
    fecha: id.fecha,
    turno: id.turno,
    saldoInicial: saldos.efectivo,
    saldoInicialTransferencia: saldos.transferencia,
    cerrado: false,
    montoContado: null,
    montoContadoTransferencia: null,
    cerradoPor: null,
    movimientos: [],
    referencia,
    ventasMostrador,
    montoEsperado: 0,
    totalTransferencias: 0,
  };
  corte.montoEsperado = calcularMontoEsperado(corte);
  corte.totalTransferencias = calcularTotalTransferencias(corte);
  return corte;
}
