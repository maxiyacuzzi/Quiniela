import { getSupabaseAdmin } from "../supabase";
import { ScrapeQuini6Result } from "./scraper";
import { MODALIDADES_ORDEN } from "./modalidades";

export interface IngestQuini6Summary {
  fecha: string;
  modalidades: number;
}

export async function ingestarQuini6(scrape: ScrapeQuini6Result): Promise<IngestQuini6Summary> {
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
    .from("quini6_resultados")
    .upsert(filas, { onConflict: "fecha,modalidad" });

  if (error) {
    throw new Error(`Error al upsertear resultados de Quini 6: ${error.message}`);
  }

  return { fecha: scrape.fecha, modalidades: filas.length };
}
