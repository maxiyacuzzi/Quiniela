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

// Un corte solo se puede cerrar CONTANDO la plata (monto contado) mientras
// sigue siendo su propio día: al día siguiente la plata física del cajón ya
// se mezcló con la del día nuevo, así que contarla tarde daría un número
// contaminado (parte de ayer, parte de hoy). Si nadie lo cierra a tiempo, no
// hace falta "cerrarlo" después: getSaldoDeCierre ya sigue solo con lo
// esperado para un corte sin cerrar, así que el saldo del día siguiente no se
// arrastra mal. Esto no aplica a corregir un corte que ya estaba cerrado
// (eso es arreglar un dato, no contar plata mezclada).
export function puedeCerrarseConConteo(fecha: string): boolean {
  return fecha >= getFechaHoyArgentina();
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

interface CorteCajaBase {
  fecha: string;
  turno: TurnoCaja;
  saldoInicial: number; // fondo fijo que se define al abrir el turno (no se hereda)
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

// Un turno que nadie abrió todavía no tiene id: se puede seguir viendo lo
// esperado (para decidir con qué monto abrirlo), pero no se le puede agregar
// movimientos ni cerrarlo hasta que exista (ver abrirCorte).
export type CorteCaja =
  | (CorteCajaBase & { existe: true; id: string })
  | (CorteCajaBase & { existe: false; id: null });

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
      .select("monto, medio_pago, monto_efectivo, monto_transferencia")
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

  // Un premio "mixto" descuenta de las dos cuentas a la vez, cada una por su
  // propia parte (no por el monto total).
  let premiosEfectivoTotal = 0;
  let cantidadPremiosEfectivo = 0;
  let premiosTransferenciaTotal = 0;
  let cantidadPremiosTransferencia = 0;
  for (const p of premios) {
    if (p.medio_pago === "efectivo") {
      premiosEfectivoTotal += Number(p.monto);
      cantidadPremiosEfectivo++;
    } else if (p.medio_pago === "transferencia") {
      premiosTransferenciaTotal += Number(p.monto);
      cantidadPremiosTransferencia++;
    } else if (p.medio_pago === "mixto") {
      premiosEfectivoTotal += Number(p.monto_efectivo ?? 0);
      premiosTransferenciaTotal += Number(p.monto_transferencia ?? 0);
      cantidadPremiosEfectivo++;
      cantidadPremiosTransferencia++;
    }
  }

  return {
    jugadasEfectivo: jugadasEfectivo.reduce((acc, j) => acc + Number(j.importe), 0),
    cantidadJugadasEfectivo: jugadasEfectivo.length,
    jugadasTransferencia: jugadasTransferencia.reduce((acc, j) => acc + Number(j.importe), 0),
    cantidadJugadasTransferencia: jugadasTransferencia.length,
    premiosEfectivo: premiosEfectivoTotal,
    cantidadPremiosEfectivo,
    premiosTransferencia: premiosTransferenciaTotal,
    cantidadPremiosTransferencia,
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
// guardados. Si nunca se abrió ("virtual"): el efectivo es 0 — ya no se
// hereda, cada turno es un fondo fijo que se define a mano al abrirlo (ver
// abrirCorte) — y la transferencia sí hereda del anterior, porque es una
// cuenta bancaria real.
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

  const saldoInicialEfectivo = fila ? Number(fila.saldo_inicial) : 0;
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

// Saldos con los que cierra el corte `id`. Solo importa para transferencias
// (la cuenta bancaria real, que sí se arrastra); el efectivo de este
// resultado no se usa para abrir el corte siguiente (ver abrirCorte), pero
// sigue sirviendo para mostrar "con cuánto cerró" cada turno.
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

function filaAMovimientos(
  filas:
    | {
        id: string;
        concepto: string;
        monto: number;
        medio_pago: string;
        creado_en: string;
        perfiles: { nombre: string } | null;
      }[]
    | null
): MovimientoCaja[] {
  return (filas ?? [])
    .map((m) => ({
      id: m.id,
      concepto: m.concepto,
      monto: Number(m.monto),
      medioPago: m.medio_pago as MedioPago,
      creadoPor: m.perfiles?.nombre ?? null,
      creadoEn: m.creado_en,
    }))
    .sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
}

const SELECT_CORTE_COMPLETO =
  "id, fecha, turno, saldo_inicial, saldo_inicial_transferencia, cerrado, monto_contado, monto_contado_transferencia, perfiles!cortes_caja_cerrado_por_fkey(nombre), movimientos_caja(id, concepto, monto, medio_pago, creado_en, perfiles(nombre))";

interface FilaCorteCompleta {
  id: string;
  fecha: string;
  turno: string;
  saldo_inicial: number;
  saldo_inicial_transferencia: number;
  cerrado: boolean;
  monto_contado: number | null;
  monto_contado_transferencia: number | null;
  perfiles: { nombre: string } | null;
  movimientos_caja:
    | {
        id: string;
        concepto: string;
        monto: number;
        medio_pago: string;
        creado_en: string;
        perfiles: { nombre: string } | null;
      }[]
    | null;
}

// Trae el corte de esa fecha/turno. Si todavía no se abrió, devuelve un
// corte "virtual" (existe: false, id: null) con el efectivo en 0 y lo
// esperado calculado igual, para que se pueda ver antes de decidir con qué
// monto abrirlo — pero nunca lo crea solo: eso lo hace abrirCorte.
export async function obtenerCorte(id: IdentificadorCorte): Promise<CorteCaja> {
  const supabase = getSupabaseAdmin();

  const [{ data: existente, error }, referencia, ventasMostrador] = await Promise.all([
    supabase
      .from("cortes_caja")
      .select(SELECT_CORTE_COMPLETO)
      .eq("fecha", id.fecha)
      .eq("turno", id.turno)
      .maybeSingle(),
    getReferenciaClientes(id),
    getVentasMostrador(id),
  ]);

  if (error) throw new Error(`Error al leer el corte de caja: ${error.message}`);

  const fila = existente as unknown as FilaCorteCompleta | null;

  const base = {
    fecha: id.fecha,
    turno: id.turno,
    cerrado: fila?.cerrado ?? false,
    montoContado: fila?.monto_contado == null ? null : Number(fila.monto_contado),
    montoContadoTransferencia:
      fila?.monto_contado_transferencia == null ? null : Number(fila.monto_contado_transferencia),
    cerradoPor: fila?.perfiles?.nombre ?? null,
    movimientos: filaAMovimientos(fila?.movimientos_caja ?? null),
    referencia,
    ventasMostrador,
  };

  const saldoInicial = fila ? Number(fila.saldo_inicial) : 0;
  const saldoInicialTransferencia = fila
    ? Number(fila.saldo_inicial_transferencia)
    : (await getSaldoDeCierre(corteAnterior(id))).transferencia;

  const corte: CorteCaja = fila
    ? { ...base, existe: true, id: fila.id, saldoInicial, saldoInicialTransferencia, montoEsperado: 0, totalTransferencias: 0 }
    : { ...base, existe: false, id: null, saldoInicial, saldoInicialTransferencia, montoEsperado: 0, totalTransferencias: 0 };

  corte.montoEsperado = calcularMontoEsperado(corte);
  corte.totalTransferencias = calcularTotalTransferencias(corte);
  return corte;
}

// Sugerencia para el monto inicial al abrir un turno nuevo: el último que se
// usó. No se hereda solo, pero repetir el mismo número todos los turnos es
// lo más común, así que conviene sugerirlo.
export async function getUltimoMontoInicialEfectivo(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cortes_caja")
    .select("saldo_inicial")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Error al leer el último monto inicial: ${error.message}`);
  return data ? Number(data.saldo_inicial) : 0;
}

// Abre (crea) el turno con el monto inicial en efectivo que elige el dueño:
// la caja ya no hereda del corte anterior, cada turno arranca en el fondo
// fijo que se define acá. La transferencia sí sigue heredando (es una cuenta
// bancaria real). Si el turno ya estaba abierto, no lo pisa.
export async function abrirCorte(
  id: IdentificadorCorte,
  montoInicialEfectivo: number,
  perfilId: string
): Promise<CorteCaja> {
  const supabase = getSupabaseAdmin();

  const { data: yaExiste } = await supabase
    .from("cortes_caja")
    .select("id")
    .eq("fecha", id.fecha)
    .eq("turno", id.turno)
    .maybeSingle();
  if (yaExiste) return obtenerCorte(id);

  const { transferencia: saldoInicialTransferencia } = await getSaldoDeCierre(corteAnterior(id));

  const { error: errorCrear } = await supabase.from("cortes_caja").insert({
    fecha: id.fecha,
    turno: id.turno,
    saldo_inicial: montoInicialEfectivo,
    saldo_inicial_transferencia: saldoInicialTransferencia,
    abierto_por: perfilId,
  });
  if (errorCrear) throw new Error(`Error al abrir el turno: ${errorCrear.message}`);

  return obtenerCorte(id);
}
