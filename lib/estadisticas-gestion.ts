import { getSupabaseAdmin } from "./supabase";
import { sumarDias, restarDias, inicioDeSemana, inicioDeMes, fechaDeIso } from "./fechas";
import { Juego, JUEGOS } from "./actividad-clientes";
import { PORCENTAJE_LOTERIA, PORCENTAJE_IMPUESTO_PREMIO } from "./liquidacion";

// Estadísticas de gestión (solo dueño) — distinto de /estadisticas (público,
// números más salidos/atrasados). Todo se agrupa por un rango de fechas que
// elige el dueño: hoy, esta semana, este mes, o el último año.

export type RangoEstadisticas = "hoy" | "semana" | "mes" | "año";

export const RANGOS: { valor: RangoEstadisticas; label: string }[] = [
  { valor: "hoy", label: "Hoy" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mes" },
  { valor: "año", label: "Último año" },
];

export function resolverRango(rango: RangoEstadisticas, hoy: string): { desde: string; hasta: string } {
  if (rango === "hoy") return { desde: hoy, hasta: hoy };
  if (rango === "semana") return { desde: inicioDeSemana(hoy), hasta: hoy };
  if (rango === "mes") return { desde: inicioDeMes(hoy), hasta: hoy };
  return { desde: restarDias(hoy, 364), hasta: hoy }; // último año (no calendario), siempre tiene datos
}

export interface PuntoSerie {
  fecha: string;
  valor: number;
}

function ventanaDeDias(desde: string, hasta: string): { desdeIso: string; hastaIso: string } {
  return { desdeIso: `${desde}T00:00:00-03:00`, hastaIso: `${sumarDias(hasta, 1)}T00:00:00-03:00` };
}

// Junta puntos sueltos {fecha, monto} en una serie ordenada por día, sin
// huecos entre `desde` y `hasta` (los días sin movimiento quedan en 0 — para
// que el gráfico no "salte" de fecha).
function serieCompleta(
  puntos: { fecha: string; monto: number }[],
  desde: string,
  hasta: string
): PuntoSerie[] {
  const porDia = new Map<string, number>();
  for (const p of puntos) porDia.set(p.fecha, (porDia.get(p.fecha) ?? 0) + p.monto);

  const serie: PuntoSerie[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    serie.push({ fecha: f, valor: porDia.get(f) ?? 0 });
  }
  return serie;
}

// ---------- Ventas y liquidación estimada ----------

export interface VentaPorJuego {
  juego: Juego;
  ventas: number;
  premiosNetos: number;
  neto: number; // positivo: depositás a la lotería. negativo: te acredita.
}

export interface EstadisticasVentas {
  porJuego: VentaPorJuego[];
  serieVentas: PuntoSerie[];
  serieNeto: PuntoSerie[];
  ventasTotal: number;
  netoTotal: number;
}

// Se agrupa por la fecha del SORTEO (misma convención que lib/liquidacion.ts)
// — lo cargado antes de que existiera ese campo (fecha/fecha_sorteo null) no
// entra en este rango, a diferencia de getLiquidacionDia que lo rescata por
// creado_en; acá no vale la pena esa complejidad extra para un panel de
// tendencias.
export async function getEstadisticasVentas(desde: string, hasta: string): Promise<EstadisticasVentas> {
  const supabase = getSupabaseAdmin();

  const [ventasRes, jugadasRes, premiosRes] = await Promise.all([
    supabase.from("ventas_mostrador").select("monto, fecha").gte("fecha", desde).lte("fecha", hasta),
    supabase
      .from("jugadas_clientes")
      .select("juego, importe, fecha")
      .gte("fecha", desde)
      .lte("fecha", hasta),
    supabase
      .from("premios_clientes")
      .select("juego, monto, fecha_sorteo")
      .gte("fecha_sorteo", desde)
      .lte("fecha_sorteo", hasta),
  ]);
  if (ventasRes.error) throw new Error(`Error al leer ventas: ${ventasRes.error.message}`);
  if (jugadasRes.error) throw new Error(`Error al leer jugadas: ${jugadasRes.error.message}`);
  if (premiosRes.error) throw new Error(`Error al leer premios: ${premiosRes.error.message}`);

  const ventasMostrador = ventasRes.data ?? [];
  const jugadas = jugadasRes.data ?? [];
  const premios = premiosRes.data ?? [];

  const porJuego: VentaPorJuego[] = JUEGOS.map((juego) => {
    const ventasJugadas = jugadas
      .filter((j) => j.juego === juego)
      .reduce((acc, j) => acc + Number(j.importe), 0);
    const ventas = juego === "quiniela" ? ventasJugadas + ventasMostrador.reduce((a, v) => a + Number(v.monto), 0) : ventasJugadas;

    const premiosBrutos = premios
      .filter((p) => p.juego === juego)
      .reduce((acc, p) => acc + Number(p.monto), 0);
    const premiosNetos = Math.round(premiosBrutos * (1 - PORCENTAJE_IMPUESTO_PREMIO[juego] / 100));
    const depositoEsperado = Math.round(ventas * (PORCENTAJE_LOTERIA / 100));

    return { juego, ventas, premiosNetos, neto: depositoEsperado - premiosNetos };
  });

  // Serie diaria: ventas de mostrador + jugadas (todas, de cualquier juego)
  // por fecha del sorteo, y el neto estimado del día (ventas del día * 85% −
  // premios netos del día) para ver la tendencia.
  const ventasPorDia = new Map<string, number>();
  for (const v of ventasMostrador) ventasPorDia.set(v.fecha, (ventasPorDia.get(v.fecha) ?? 0) + Number(v.monto));
  for (const j of jugadas) ventasPorDia.set(j.fecha, (ventasPorDia.get(j.fecha) ?? 0) + Number(j.importe));

  const premiosNetosPorDia = new Map<string, number>();
  for (const p of premios) {
    const impuesto = PORCENTAJE_IMPUESTO_PREMIO[p.juego as Juego] ?? 0;
    const neto = Number(p.monto) * (1 - impuesto / 100);
    premiosNetosPorDia.set(p.fecha_sorteo, (premiosNetosPorDia.get(p.fecha_sorteo) ?? 0) + neto);
  }

  const serieVentas = serieCompleta(
    [...ventasPorDia.entries()].map(([fecha, monto]) => ({ fecha, monto })),
    desde,
    hasta
  );
  const serieNeto = serieVentas.map((pv) => ({
    fecha: pv.fecha,
    valor: Math.round(pv.valor * (PORCENTAJE_LOTERIA / 100) - (premiosNetosPorDia.get(pv.fecha) ?? 0)),
  }));

  return {
    porJuego,
    serieVentas,
    serieNeto,
    ventasTotal: porJuego.reduce((a, j) => a + j.ventas, 0),
    netoTotal: porJuego.reduce((a, j) => a + j.neto, 0),
  };
}

// ---------- Caja (efectivo y transferencias) ----------

export interface EstadisticasCaja {
  serie: {
    fecha: string;
    entroEfectivo: number;
    salioEfectivo: number;
    entroTransferencia: number;
    salioTransferencia: number;
  }[];
  totalEntroEfectivo: number;
  totalSalioEfectivo: number;
  totalEntroTransferencia: number;
  totalSalioTransferencia: number;
}

// Cuánto entró/salió de cada cuenta por día, según cuándo se cobró/pagó
// (creado_en) — no reconstruye saldos arrastrados corte a corte (eso es
// lib/caja.ts): acá solo importa el movimiento de cada día para ver la
// tendencia, no el saldo puntual de un turno.
export async function getEstadisticasCaja(desde: string, hasta: string): Promise<EstadisticasCaja> {
  const supabase = getSupabaseAdmin();
  const { desdeIso, hastaIso } = ventanaDeDias(desde, hasta);

  const [ventasRes, jugadasRes, premiosRes, cobrosRes, movimientosRes] = await Promise.all([
    supabase
      .from("ventas_mostrador")
      .select("monto, medio_pago, creado_en")
      .gte("creado_en", desdeIso)
      .lt("creado_en", hastaIso),
    supabase
      .from("jugadas_clientes")
      .select("importe, medio_pago, creado_en")
      .eq("fiado", false)
      .gte("creado_en", desdeIso)
      .lt("creado_en", hastaIso),
    supabase
      .from("premios_clientes")
      .select("monto, medio_pago, monto_efectivo, monto_transferencia, creado_en")
      .eq("pagado", true)
      .gte("creado_en", desdeIso)
      .lt("creado_en", hastaIso),
    supabase
      .from("movimientos_cliente")
      .select("monto, medio_pago, creado_en")
      .eq("cobro_deuda", true)
      .gte("creado_en", desdeIso)
      .lt("creado_en", hastaIso),
    supabase
      .from("movimientos_caja")
      .select("monto, medio_pago, creado_en")
      .gte("creado_en", desdeIso)
      .lt("creado_en", hastaIso),
  ]);
  for (const r of [ventasRes, jugadasRes, premiosRes, cobrosRes, movimientosRes]) {
    if (r.error) throw new Error(`Error al leer la caja: ${r.error.message}`);
  }

  const entroEf = new Map<string, number>();
  const salioEf = new Map<string, number>();
  const entroTr = new Map<string, number>();
  const salioTr = new Map<string, number>();
  const sumar = (mapa: Map<string, number>, fecha: string, monto: number) =>
    mapa.set(fecha, (mapa.get(fecha) ?? 0) + monto);

  for (const v of ventasRes.data ?? []) {
    const f = fechaDeIso(v.creado_en);
    sumar(v.medio_pago === "transferencia" ? entroTr : entroEf, f, Number(v.monto));
  }
  for (const j of jugadasRes.data ?? []) {
    const f = fechaDeIso(j.creado_en);
    sumar(j.medio_pago === "transferencia" ? entroTr : entroEf, f, Number(j.importe));
  }
  for (const c of cobrosRes.data ?? []) {
    const f = fechaDeIso(c.creado_en);
    sumar(c.medio_pago === "transferencia" ? entroTr : entroEf, f, Math.abs(Number(c.monto)));
  }
  for (const p of premiosRes.data ?? []) {
    const f = fechaDeIso(p.creado_en);
    // "cuenta" no mueve plata física (se descontó de la deuda del cliente).
    if (p.medio_pago === "efectivo") sumar(salioEf, f, Number(p.monto));
    else if (p.medio_pago === "transferencia") sumar(salioTr, f, Number(p.monto));
    else if (p.medio_pago === "mixto") {
      sumar(salioEf, f, Number(p.monto_efectivo ?? 0));
      sumar(salioTr, f, Number(p.monto_transferencia ?? 0));
    }
  }
  for (const m of movimientosRes.data ?? []) {
    const f = fechaDeIso(m.creado_en);
    const mapa: Map<string, number> =
      Number(m.monto) >= 0
        ? m.medio_pago === "transferencia"
          ? entroTr
          : entroEf
        : m.medio_pago === "transferencia"
          ? salioTr
          : salioEf;
    sumar(mapa, f, Math.abs(Number(m.monto)));
  }

  const dias: string[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) dias.push(f);

  const serie = dias.map((fecha) => ({
    fecha,
    entroEfectivo: entroEf.get(fecha) ?? 0,
    salioEfectivo: salioEf.get(fecha) ?? 0,
    entroTransferencia: entroTr.get(fecha) ?? 0,
    salioTransferencia: salioTr.get(fecha) ?? 0,
  }));

  const sumaTotal = (mapa: Map<string, number>) => [...mapa.values()].reduce((a, b) => a + b, 0);

  return {
    serie,
    totalEntroEfectivo: sumaTotal(entroEf),
    totalSalioEfectivo: sumaTotal(salioEf),
    totalEntroTransferencia: sumaTotal(entroTr),
    totalSalioTransferencia: sumaTotal(salioTr),
  };
}

// ---------- Premios pagados ----------

export interface PremioPorJuego {
  juego: Juego;
  pagado: number;
  pendiente: number;
}

export interface EstadisticasPremios {
  porJuego: PremioPorJuego[];
  seriePagado: PuntoSerie[];
  totalPagado: number;
  totalPendiente: number;
}

// Agrupado por fecha del sorteo, misma convención que Ventas.
export async function getEstadisticasPremios(desde: string, hasta: string): Promise<EstadisticasPremios> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("premios_clientes")
    .select("juego, monto, pagado, fecha_sorteo")
    .gte("fecha_sorteo", desde)
    .lte("fecha_sorteo", hasta);
  if (error) throw new Error(`Error al leer premios: ${error.message}`);

  const premios = data ?? [];

  const porJuego: PremioPorJuego[] = JUEGOS.map((juego) => {
    const deJuego = premios.filter((p) => p.juego === juego);
    return {
      juego,
      pagado: deJuego.filter((p) => p.pagado).reduce((a, p) => a + Number(p.monto), 0),
      pendiente: deJuego.filter((p) => !p.pagado).reduce((a, p) => a + Number(p.monto), 0),
    };
  });

  const seriePagado = serieCompleta(
    premios.filter((p) => p.pagado).map((p) => ({ fecha: p.fecha_sorteo, monto: Number(p.monto) })),
    desde,
    hasta
  );

  return {
    porJuego,
    seriePagado,
    totalPagado: porJuego.reduce((a, j) => a + j.pagado, 0),
    totalPendiente: porJuego.reduce((a, j) => a + j.pendiente, 0),
  };
}

// ---------- Clientes y deuda ----------

export interface EstadisticasClientes {
  totalMeDeben: number; // suma de saldos positivos (ahora)
  totalLesDebo: number; // suma de |saldos negativos| (ahora)
  cantidadActivos: number;
  topDeudores: { nombre: string; saldo: number }[];
  serieDeudaNeta: PuntoSerie[]; // saldo total de todos los clientes, día a día
}

export async function getEstadisticasClientes(desde: string, hasta: string): Promise<EstadisticasClientes> {
  const supabase = getSupabaseAdmin();
  const { hastaIso } = ventanaDeDias(desde, hasta);

  const [clientesRes, movimientosRes] = await Promise.all([
    supabase.from("clientes_con_saldo").select("nombre, saldo, activo"),
    // Todo lo cargado hasta el final del rango: lo anterior a `desde` da el
    // punto de partida de la serie, lo de adentro la va moviendo día a día.
    supabase.from("movimientos_cliente").select("monto, creado_en").lt("creado_en", hastaIso),
  ]);
  if (clientesRes.error) throw new Error(`Error al leer clientes: ${clientesRes.error.message}`);
  if (movimientosRes.error) throw new Error(`Error al leer movimientos: ${movimientosRes.error.message}`);

  const clientes = clientesRes.data ?? [];
  const activos = clientes.filter((c) => c.activo);
  const totalMeDeben = activos.filter((c) => c.saldo > 0).reduce((a, c) => a + Number(c.saldo), 0);
  const totalLesDebo = activos.filter((c) => c.saldo < 0).reduce((a, c) => a + Math.abs(Number(c.saldo)), 0);
  const topDeudores = [...activos]
    .filter((c) => c.saldo > 0)
    .sort((a, b) => Number(b.saldo) - Number(a.saldo))
    .slice(0, 5)
    .map((c) => ({ nombre: c.nombre, saldo: Number(c.saldo) }));

  const porDia = new Map<string, number>();
  let saldoInicial = 0;
  for (const m of movimientosRes.data ?? []) {
    const f = fechaDeIso(m.creado_en);
    if (f < desde) saldoInicial += Number(m.monto);
    else porDia.set(f, (porDia.get(f) ?? 0) + Number(m.monto));
  }

  const serieDeudaNeta: PuntoSerie[] = [];
  let acumulado = saldoInicial;
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    acumulado += porDia.get(f) ?? 0;
    serieDeudaNeta.push({ fecha: f, valor: acumulado });
  }

  return {
    totalMeDeben,
    totalLesDebo,
    cantidadActivos: activos.length,
    topDeudores,
    serieDeudaNeta,
  };
}
