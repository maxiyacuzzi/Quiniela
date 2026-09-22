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
export async function asegurarFecha(fecha: string): Promise<{ disponible: boolean }> {
  const supabase = getSupabaseAdmin();

  const { data: filas, error } = await supabase
    .from("resultados")
    .select("turno, numero")
    .eq("fecha", fecha);

  if (error) throw new Error(`Error al chequear la fecha ${fecha}: ${error.message}`);

  // La fuente a veces pre-declara un turno (fila guardada) antes de que salga
  // el número, o publica mal una posición puntual — solo cuenta como
  // "completo" si tiene las 50 filas con número real.
  const conteoPorTurno = new Map<string, number>();
  for (const f of filas ?? []) {
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

  const scrape = await scrapeCabezas(fecha);
  if (!scrape.disponible) return { disponible: conteoPorTurno.size > 0 };

  await ingestarResultados(scrape);
  return { disponible: true };
}
