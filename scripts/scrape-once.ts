import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.local") });

import { scrapeCabezas } from "../lib/scraper";
import { ingestarResultados } from "../lib/ingest";
import { getFechaHoyArgentina } from "../lib/fechas";

async function main() {
  const fecha = getFechaHoyArgentina();
  const scrape = await scrapeCabezas(fecha);
  const resumen = await ingestarResultados(scrape);
  if (!scrape.disponible) {
    console.log(`Sin datos disponibles todavía para ${fecha} (¿no arrancaron los sorteos?).`);
    return;
  }
  console.log(`OK — fecha ${resumen.fecha}: ${resumen.filas} resultados, ${resumen.jurisdicciones} jurisdicciones.`);
}

main().catch((err) => {
  console.error("Falló el scrape:", err instanceof Error ? err.message : err);
  process.exit(1);
});
