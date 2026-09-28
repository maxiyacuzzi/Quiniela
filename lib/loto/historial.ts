import { getSupabaseAdmin } from "../supabase";
import { scrapeLoto } from "./scraper";
import { ingestarLoto } from "./ingest";
import { MODALIDADES_ORDEN } from "./modalidades";

// Mismo patrón que asegurarFechaQuini6: si ya están las 4 modalidades
// guardadas para esa fecha, no vuelve a pedirla a la fuente.
export async function asegurarFechaLoto(fecha: string): Promise<{ disponible: boolean }> {
  const supabase = getSupabaseAdmin();

  const { data: filas, error } = await supabase
    .from("loto_resultados")
    .select("modalidad")
    .eq("fecha", fecha);

  if (error) throw new Error(`Error al chequear la fecha ${fecha}: ${error.message}`);

  const modalidadesGuardadas = new Set((filas ?? []).map((f) => f.modalidad));
  if (MODALIDADES_ORDEN.every((m) => modalidadesGuardadas.has(m))) {
    return { disponible: true };
  }

  const scrape = await scrapeLoto(fecha);
  if (!scrape.disponible) return { disponible: modalidadesGuardadas.size > 0 };

  await ingestarLoto(scrape);
  return { disponible: true };
}
