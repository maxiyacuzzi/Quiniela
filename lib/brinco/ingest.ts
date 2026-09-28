import { getSupabaseAdmin } from "../supabase";
import { ScrapeBrincoResult } from "./scraper";
import { MODALIDADES_ORDEN } from "./modalidades";

export interface IngestBrincoSummary {
  fecha: string;
  modalidades: number;
}

export async function ingestarBrinco(scrape: ScrapeBrincoResult): Promise<IngestBrincoSummary> {
  if (!scrape.disponible) {
    return { fecha: scrape.fecha, modalidades: 0 };
  }

  const supabase = getSupabaseAdmin();

  const filas = MODALIDADES_ORDEN.map((modalidad) => ({
    fecha: scrape.fecha,
    sorteo: scrape.sorteo,
    modalidad,
    numeros: scrape.modalidades[modalidad],
  }));

  const { error } = await supabase
    .from("brinco_resultados")
    .upsert(filas, { onConflict: "fecha,modalidad" });

  if (error) {
    throw new Error(`Error al upsertear resultados de Brinco: ${error.message}`);
  }

  return { fecha: scrape.fecha, modalidades: filas.length };
}
