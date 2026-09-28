import { scrapeBrinco } from "./scraper";
import { ingestarBrinco } from "./ingest";

// A diferencia de asegurarFechaQuini6 (que puede pedirle a la fuente una fecha
// puntual), acá no hay fecha para pedir: la fuente solo devuelve el último
// sorteo. Esta función simplemente lo trae y lo guarda (upsert, es idempotente).
export async function asegurarUltimoSorteoBrinco(): Promise<{ disponible: boolean }> {
  const scrape = await scrapeBrinco();
  if (!scrape.disponible) return { disponible: false };

  await ingestarBrinco(scrape);
  return { disponible: true };
}
