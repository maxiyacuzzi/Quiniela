import { getSupabaseAdmin } from "../supabase";
import { scrapeQuini6 } from "./scraper";
import { ingestarQuini6 } from "./ingest";
import { MODALIDADES_ORDEN } from "./modalidades";

// Mismo patrón que asegurarFecha (quiniela): si ya están las 4 modalidades
// guardadas para esa fecha, no vuelve a pedirla a la fuente.
export async function asegurarFechaQuini6(fecha: string): Promise<{ disponible: boolean }> {
  const supabase = getSupabaseAdmin();

  const { data: filas, error } = await supabase
    .from("quini6_resultados")
    .select("modalidad")
    .eq("fecha", fecha);

  if (error) throw new Error(`Error al chequear la fecha ${fecha}: ${error.message}`);

  const modalidadesGuardadas = new Set((filas ?? []).map((f) => f.modalidad));
  if (MODALIDADES_ORDEN.every((m) => modalidadesGuardadas.has(m))) {
    return { disponible: true };
  }

  const scrape = await scrapeQuini6(fecha);
  if (!scrape.disponible) return { disponible: modalidadesGuardadas.size > 0 };

  await ingestarQuini6(scrape);
  return { disponible: true };
}
