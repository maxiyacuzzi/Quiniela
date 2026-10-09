import { getSupabaseAdmin } from "./supabase";
import { sumarDias, restarDias, diaDeLaSemana } from "./fechas";
import { Juego, JUEGOS } from "./actividad-clientes";

// Porcentaje que se queda la lotería sobre lo vendido (el resto es la
// comisión de la agencia) — confirmado 85/15 para los 4 juegos.
export const PORCENTAJE_LOTERIA = 85;
export const PORCENTAJE_AGENCIA = 100 - PORCENTAJE_LOTERIA;

// Porcentaje que la lotería retiene del premio antes de acreditárselo a la
// agencia (impuesto sobre el premio) — distinto según el juego. Confirmado:
// Quiniela 2%, Quini6 31%. Loto/Brinco: mismo 31% de Quini6 como referencia
// provisoria (son juegos de pozo como Quini6, a diferencia de Quiniela que
// es por cifras) — a confirmar.
export const PORCENTAJE_IMPUESTO_PREMIO: Record<Juego, number> = {
  quiniela: 2,
  quini6: 31,
  loto: 31,
  brinco: 31,
};

export interface LiquidacionJuego {
  juego: Juego;
  ventas: number; // todo lo vendido ese día, sin importar si fue fiado
  premiosBrutos: number; // todos los premios de ese día, pagados o no
  impuestoPremio: number; // % retenido sobre el premio, informativo
  premiosNetos: number; // premiosBrutos ya con el impuesto descontado
  depositoEsperado: number; // ventas * PORCENTAJE_LOTERIA/100
  neto: number; // depositoEsperado - premiosNetos. positivo: la agencia deposita. negativo: la lotería le acredita.
}

export interface LiquidacionDia {
  fecha: string;
  fechas: string[]; // [fecha] un día normal; [viernes, sábado] cuando se juntan (ver getLiquidacionDia)
  porJuego: LiquidacionJuego[];
  netoTotal: number;
}

// La quiniela no sortea los domingos: lo que se vendió y se ganó el viernes
// y el sábado la lotería lo liquida junto, en un solo memo que llega recién
// el lunes. Si se pide el sábado, por default se suma también el viernes
// para que el estimado coincida con ese memo real — se puede desactivar
// (p. ej. para la grilla de Resumen por día, que necesita un número por día
// sin duplicar el viernes en dos columnas).
export interface OpcionesLiquidacion {
  juntarFinDeSemana?: boolean; // default: true
}

// Qué fecha mostrar por default al abrir la Liquidación estimada: el sorteo
// de ayer, salvo que ayer sea domingo (no hay sorteo) — ahí se muestra el
// sábado, que ya trae juntado el viernes.
export function fechaLiquidacionPorDefecto(hoy: string): string {
  return saltarDomingoSinSorteo(restarDias(hoy, 1));
}

// Para el botón "Día anterior" del panel: igual que el default, pero
// partiendo de la fecha que se esté mirando en vez de hoy.
export function diaAnteriorConSorteo(fecha: string): string {
  return saltarDomingoSinSorteo(restarDias(fecha, 1));
}

function saltarDomingoSinSorteo(fecha: string): string {
  return diaDeLaSemana(fecha) === 0 ? restarDias(fecha, 1) : fecha;
}

// Se agrupa por la fecha del SORTEO (no por cuándo se cobró: eso es la caja).
//
// Estimación de referencia para comparar contra el memo real que manda la
// lotería al otro día del sorteo — nunca crea ningún movimiento solo, es
// puramente informativo.
//
// Las "ventas de mostrador" (sin cliente, cargadas con fecha+monto) se
// asumen siempre de Quiniela — es el único juego que se vende así de
// mostrador en la agencia hoy; Quini6/Loto/Brinco solo se cargan atados a
// un cliente en "Jugadas".
export async function getLiquidacionDia(
  fecha: string,
  opciones: OpcionesLiquidacion = {}
): Promise<LiquidacionDia> {
  const juntarFinDeSemana = opciones.juntarFinDeSemana ?? true;
  const fechas = juntarFinDeSemana && diaDeLaSemana(fecha) === 6 ? [restarDias(fecha, 1), fecha] : [fecha];

  const supabase = getSupabaseAdmin();

  const desde = `${fechas[0]}T00:00:00-03:00`;
  const hasta = `${sumarDias(fechas[fechas.length - 1], 1)}T00:00:00-03:00`;
  const fechasSql = `(${fechas.join(",")})`;

  const [ventasMostradorRes, jugadasRes, premiosRes] = await Promise.all([
    supabase.from("ventas_mostrador").select("monto").in("fecha", fechas),
    // Por fecha del sorteo; lo que no la tiene (cargado antes de existir el
    // campo) se toma por el día (o los dos días) en que se cargó.
    supabase
      .from("jugadas_clientes")
      .select("juego, importe")
      .or(`fecha.in.${fechasSql},and(fecha.is.null,creado_en.gte.${desde},creado_en.lt.${hasta})`),
    supabase
      .from("premios_clientes")
      .select("juego, monto")
      .or(
        `fecha_sorteo.in.${fechasSql},and(fecha_sorteo.is.null,creado_en.gte.${desde},creado_en.lt.${hasta})`
      ),
  ]);

  if (ventasMostradorRes.error) {
    throw new Error(`Error al leer ventas de mostrador: ${ventasMostradorRes.error.message}`);
  }
  if (jugadasRes.error) throw new Error(`Error al leer jugadas: ${jugadasRes.error.message}`);
  if (premiosRes.error) throw new Error(`Error al leer premios: ${premiosRes.error.message}`);

  const ventasMostrador = (ventasMostradorRes.data ?? []).reduce(
    (acc, v) => acc + Number(v.monto),
    0
  );

  const porJuego: LiquidacionJuego[] = JUEGOS.map((juego) => {
    const ventasJugadas = (jugadasRes.data ?? [])
      .filter((j) => j.juego === juego)
      .reduce((acc, j) => acc + Number(j.importe), 0);
    const ventas = juego === "quiniela" ? ventasJugadas + ventasMostrador : ventasJugadas;

    const premiosBrutos = (premiosRes.data ?? [])
      .filter((p) => p.juego === juego)
      .reduce((acc, p) => acc + Number(p.monto), 0);

    const impuestoPremio = PORCENTAJE_IMPUESTO_PREMIO[juego];
    const premiosNetos = Math.round(premiosBrutos * (1 - impuestoPremio / 100));

    const depositoEsperado = Math.round(ventas * (PORCENTAJE_LOTERIA / 100));
    const neto = depositoEsperado - premiosNetos;

    return { juego, ventas, premiosBrutos, impuestoPremio, premiosNetos, depositoEsperado, neto };
  });

  const netoTotal = porJuego.reduce((acc, j) => acc + j.neto, 0);

  return { fecha, fechas, porJuego, netoTotal };
}
