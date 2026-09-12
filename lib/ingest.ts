import { getSupabaseAdmin } from "./supabase";
import { ScrapeResult } from "./scraper";

export interface IngestSummary {
  fecha: string;
  jurisdicciones: number;
  filas: number;
}

export async function ingestarResultados(scrape: ScrapeResult): Promise<IngestSummary> {
  const supabase = getSupabaseAdmin();

  const jurisdiccionesUnicas = new Map<string, string>();
  for (const r of scrape.resultados) {
    if (!jurisdiccionesUnicas.has(r.jurisdiccionSlug)) {
      jurisdiccionesUnicas.set(r.jurisdiccionSlug, r.jurisdiccionNombre);
    }
  }

  const jurisdiccionesRows = Array.from(jurisdiccionesUnicas.entries()).map(
    ([slug, nombre], i) => ({ slug, nombre, orden: i })
  );

  const { error: errJurisdicciones } = await supabase
    .from("jurisdicciones")
    .upsert(jurisdiccionesRows, { onConflict: "slug", ignoreDuplicates: false });

  if (errJurisdicciones) {
    throw new Error(`Error al upsertear jurisdicciones: ${errJurisdicciones.message}`);
  }

  const resultadosRows = scrape.resultados.map((r) => ({
    jurisdiccion_slug: r.jurisdiccionSlug,
    turno: r.turno,
    numero: r.numero,
    fecha: scrape.fecha,
  }));

  const { error: errResultados } = await supabase
    .from("resultados")
    .upsert(resultadosRows, { onConflict: "jurisdiccion_slug,turno,fecha" });

  if (errResultados) {
    throw new Error(`Error al upsertear resultados: ${errResultados.message}`);
  }

  return {
    fecha: scrape.fecha,
    jurisdicciones: jurisdiccionesRows.length,
    filas: resultadosRows.length,
  };
}
