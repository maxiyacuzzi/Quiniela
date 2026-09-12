import "dotenv/config";
import { scrapeCabezas } from "../lib/scraper";
import { ingestarResultados } from "../lib/ingest";

async function main() {
  const scrape = await scrapeCabezas();
  const resumen = await ingestarResultados(scrape);
  console.log(`OK — fecha ${resumen.fecha}: ${resumen.filas} resultados, ${resumen.jurisdicciones} jurisdicciones.`);
}

main().catch((err) => {
  console.error("Falló el scrape:", err instanceof Error ? err.message : err);
  process.exit(1);
});
