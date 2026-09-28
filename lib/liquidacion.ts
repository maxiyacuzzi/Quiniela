import { getSupabaseAdmin } from "./supabase";
import { sumarDias } from "./fechas";
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
  porJuego: LiquidacionJuego[];
  netoTotal: number;
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
export async function getLiquidacionDia(fecha: string): Promise<LiquidacionDia> {
  const supabase = getSupabaseAdmin();

  const desde = `${fecha}T00:00:00-03:00`;
  const hasta = `${sumarDias(fecha, 1)}T00:00:00-03:00`;

  const [ventasMostradorRes, jugadasRes, premiosRes] = await Promise.all([
    supabase.from("ventas_mostrador").select("monto").eq("fecha", fecha),
    // Por fecha del sorteo; lo que no la tiene (cargado antes de existir el
    // campo) se toma por el día en que se cargó.
    supabase
      .from("jugadas_clientes")
      .select("juego, importe")
      .or(`fecha.eq.${fecha},and(fecha.is.null,creado_en.gte.${desde},creado_en.lt.${hasta})`),
    supabase
      .from("premios_clientes")
      .select("juego, monto")
      .or(
        `fecha_sorteo.eq.${fecha},and(fecha_sorteo.is.null,creado_en.gte.${desde},creado_en.lt.${hasta})`
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

  return { fecha, porJuego, netoTotal };
}
