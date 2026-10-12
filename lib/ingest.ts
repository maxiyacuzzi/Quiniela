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

  // Una posición que ya tiene un número guardado no se vuelve a tocar —
  // tanto si lo cargó el scraper antes como si lo corrigió el dueño a mano
  // en /gestion/sorteos (ver guardarResultadosAction). Si no, cada visita a
  // /ultimo-sorteo (que dispara un re-scrape mientras el día no esté 100%
  // completo) terminaba pisando la corrección manual con lo que la fuente
  // externa siga teniendo publicado, aunque esté mal.
  const { data: yaGuardadas, error: errExistentes } = await supabase
    .from("resultados")
    .select("jurisdiccion_slug, turno, posicion")
    .eq("fecha", scrape.fecha)
    .not("numero", "is", null);
  if (errExistentes) {
    throw new Error(`Error al leer los resultados ya guardados: ${errExistentes.message}`);
  }
  const clavesConValor = new Set(
    (yaGuardadas ?? []).map((f) => `${f.jurisdiccion_slug}|${f.turno}|${f.posicion}`)
  );

  const resultadosRows = scrape.resultados
    .filter((r) => !clavesConValor.has(`${r.jurisdiccionSlug}|${r.turno}|${r.posicion}`))
    .map((r) => ({
      jurisdiccion_slug: r.jurisdiccionSlug,
      turno: r.turno,
      posicion: r.posicion,
      numero: r.numero,
      fecha: scrape.fecha,
    }));

  if (resultadosRows.length > 0) {
    const { error: errResultados } = await supabase
      .from("resultados")
      .upsert(resultadosRows, { onConflict: "jurisdiccion_slug,turno,posicion,fecha" });

    if (errResultados) {
      throw new Error(`Error al upsertear resultados: ${errResultados.message}`);
    }
  }

  return {
    fecha: scrape.fecha,
    jurisdicciones: jurisdiccionesRows.length,
    filas: resultadosRows.length,
  };
}
