import { getSupabaseAdmin } from "../supabase";
import { ScrapeLotoResult } from "./scraper";
import { MODALIDADES_ORDEN } from "./modalidades";

export interface IngestLotoSummary {
  fecha: string;
  modalidades: number;
}

export async function ingestarLoto(scrape: ScrapeLotoResult): Promise<IngestLotoSummary> {
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
    .from("loto_resultados")
    .upsert(filas, { onConflict: "fecha,modalidad" });

  if (error) {
    throw new Error(`Error al upsertear resultados de Loto: ${error.message}`);
  }

  return { fecha: scrape.fecha, modalidades: filas.length };
}
