import { getSupabaseAdmin } from "./supabase";
import { scrapeCabezas } from "./scraper";
import { ingestarResultados } from "./ingest";
import { TURNOS_ORDEN } from "./turnos";
import { JURISDICCIONES } from "./jurisdicciones";

// Cuántas filas con número real esperamos por turno cuando está 100% completo
// (5 jurisdicciones × 10 posiciones).
const NUMEROS_ESPERADOS_POR_TURNO = JURISDICCIONES.length * 10;

// Si la fecha ya tiene los 5 turnos completos (todas las posiciones con
// número real), no vuelve a pedirla a la fuente. Si falta alguna posición
// (turno recién guardado antes de Vespertina/Nocturna, o la fuente publicó
// mal un valor puntual), vuelve a scrapear para completarla — el upsert no
// duplica lo que ya está. Funciona para cualquier fecha pasada, no solo "hoy".
// Devuelve `disponible: false` si la fuente no tiene datos para esa fecha
// (fuera de rango, o un día sin sorteo, p. ej. domingo) y no había nada guardado.
// Esta función nunca tira una excepción hacia arriba: se usa desde páginas
// como /ultimo-sorteo y /sorteos que tienen que seguir mostrando lo que ya
// está guardado aunque en ese momento falle la red (hacia Supabase o hacia
// la fuente externa) — un problema transitorio no puede tumbar la pantalla.
export async function asegurarFecha(fecha: string): Promise<{ disponible: boolean }> {
  const supabase = getSupabaseAdmin();

  let filas: { turno: string; numero: string | null }[];
  try {
    const { data, error } = await supabase
      .from("resultados")
      .select("turno, numero")
      .eq("fecha", fecha);
    if (error) throw new Error(error.message);
    filas = data ?? [];
  } catch (err) {
    console.error(`asegurarFecha(${fecha}): no se pudo chequear lo ya guardado`, err);
    return { disponible: false };
  }

  // La fuente a veces pre-declara un turno (fila guardada) antes de que salga
  // el número, o publica mal una posición puntual — solo cuenta como
  // "completo" si tiene las 50 filas con número real.
  const conteoPorTurno = new Map<string, number>();
  for (const f of filas) {
    if (f.numero !== null) {
      conteoPorTurno.set(f.turno, (conteoPorTurno.get(f.turno) ?? 0) + 1);
    }
  }
  const turnosCompletos = new Set(
    [...conteoPorTurno.entries()]
      .filter(([, cantidad]) => cantidad >= NUMEROS_ESPERADOS_POR_TURNO)
      .map(([turno]) => turno)
  );
  if (TURNOS_ORDEN.every((t) => turnosCompletos.has(t))) return { disponible: true };

  let scrape;
  try {
    scrape = await scrapeCabezas(fecha);
  } catch (err) {
    console.error(`asegurarFecha(${fecha}): no se pudo scrapear la fuente`, err);
    return { disponible: conteoPorTurno.size > 0 };
  }
  if (!scrape.disponible) return { disponible: conteoPorTurno.size > 0 };

  try {
    await ingestarResultados(scrape);
  } catch (err) {
    console.error(`asegurarFecha(${fecha}): no se pudo guardar lo scrapeado`, err);
    return { disponible: conteoPorTurno.size > 0 };
  }
  return { disponible: true };
}
