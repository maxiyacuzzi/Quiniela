import { getSupabaseAdmin } from "./supabase";
import { ScrapeResult } from "./scraper";
import { JURISDICCIONES } from "./jurisdicciones";

export interface IngestSummary {
  fecha: string;
  jurisdicciones: number;
  filas: number;
}

export async function ingestarResultados(scrape: ScrapeResult): Promise<IngestSummary> {
  if (!scrape.disponible) {
    return { fecha: scrape.fecha, jurisdicciones: 0, filas: 0 };
  }

  const supabase = getSupabaseAdmin();

  const jurisdiccionesRows = JURISDICCIONES.map((j, i) => ({
    slug: j.slug,
    nombre: j.nombre,
    orden: i,
  }));

  const { error: errJurisdicciones } = await supabase
    .from("jurisdicciones")
    .upsert(jurisdiccionesRows, { onConflict: "slug", ignoreDuplicates: false });

  if (errJurisdicciones) {
    throw new Error(`Error al upsertear jurisdicciones: ${errJurisdicciones.message}`);
  }

  const resultadosRows = scrape.resultados.map((r) => ({
    jurisdiccion_slug: r.jurisdiccionSlug,
    turno: r.turno,
    posicion: r.posicion,
    numero: r.numero,
    fecha: scrape.fecha,
  }));

  const { error: errResultados } = await supabase
    .from("resultados")
    .upsert(resultadosRows, { onConflict: "jurisdiccion_slug,turno,posicion,fecha" });

  if (errResultados) {
    throw new Error(`Error al upsertear resultados: ${errResultados.message}`);
  }

  return {
    fecha: scrape.fecha,
    jurisdicciones: jurisdiccionesRows.length,
    filas: resultadosRows.length,
  };
}
