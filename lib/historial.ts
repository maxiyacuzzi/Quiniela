import { getSupabaseAdmin } from "./supabase";
import { scrapeCabezas } from "./scraper";
import { ingestarResultados } from "./ingest";
import { TURNOS_ORDEN } from "./turnos";

// Si la fecha ya tiene los 5 turnos guardados, no vuelve a pedirla a la fuente.
// Si falta alguno (p. ej. se guardó a media tarde, antes de Vespertina/Nocturna),
// vuelve a scrapear para completarla — el upsert no duplica lo que ya está.
// Funciona para cualquier fecha pasada, no solo "hoy".
// Devuelve `disponible: false` si la fuente no tiene datos para esa fecha
// (fuera de rango, o un día sin sorteo, p. ej. domingo) y no había nada guardado.
export async function asegurarFecha(fecha: string): Promise<{ disponible: boolean }> {
  const supabase = getSupabaseAdmin();

  const { data: filas, error } = await supabase
    .from("resultados")
    .select("turno")
    .eq("fecha", fecha);

  if (error) throw new Error(`Error al chequear la fecha ${fecha}: ${error.message}`);

  const turnosGuardados = new Set((filas ?? []).map((f) => f.turno));
  if (TURNOS_ORDEN.every((t) => turnosGuardados.has(t))) return { disponible: true };

  const scrape = await scrapeCabezas(fecha);
  if (!scrape.disponible) return { disponible: turnosGuardados.size > 0 };

  await ingestarResultados(scrape);
  return { disponible: true };
}
