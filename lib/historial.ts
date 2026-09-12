import { getSupabaseAdmin } from "./supabase";
import { scrapeCabezas } from "./scraper";
import { ingestarResultados } from "./ingest";

// Si la fecha ya está guardada, no vuelve a pedirla a la fuente. Si no está,
// la trae (funciona para cualquier fecha pasada, no solo "hoy") y la guarda.
// Devuelve `disponible: false` si la fuente no tiene datos para esa fecha
// (fuera de rango, o un día sin sorteo, p. ej. domingo).
export async function asegurarFecha(fecha: string): Promise<{ disponible: boolean }> {
  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from("resultados")
    .select("id", { count: "exact", head: true })
    .eq("fecha", fecha);

  if (error) throw new Error(`Error al chequear la fecha ${fecha}: ${error.message}`);
  if ((count ?? 0) > 0) return { disponible: true };

  const scrape = await scrapeCabezas(fecha);
  if (!scrape.disponible) return { disponible: false };

  await ingestarResultados(scrape);
  return { disponible: true };
}
