import * as cheerio from "cheerio";
import { MOMENTO_A_TURNO, TurnoKey } from "./turnos";

const FUENTE_URL = "https://vivitusuerte.com/cabezas";

export interface JurisdiccionInfo {
  slug: string;
  nombre: string;
}

export interface ResultadoScrapeado {
  jurisdiccionSlug: string;
  jurisdiccionNombre: string;
  turno: TurnoKey;
  numero: string | null;
}

export interface ScrapeResult {
  fecha: string; // YYYY-MM-DD
  resultados: ResultadoScrapeado[];
}

function slugDesdeHref(href: string): string {
  // href tiene forma "//vivitusuerte.com/pizarra/santa+fe" -> "santa+fe"
  const partes = href.split("/pizarra/");
  return decodeURIComponent(partes[1] ?? "").trim();
}

export async function scrapeCabezas(): Promise<ScrapeResult> {
  const res = await fetch(FUENTE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; quiniela-app/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`No se pudo descargar ${FUENTE_URL}: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const seccion = $("#seccionCabezas");
  const fecha = seccion.attr("data-fecha-default");
  if (!fecha) {
    throw new Error("No se encontró data-fecha-default en #seccionCabezas (¿cambió el HTML fuente?)");
  }

  const resultados: ResultadoScrapeado[] = [];

  seccion.find("[data-cabezas-diarias-juego]").each((_, bloque) => {
    const $bloque = $(bloque);
    const link = $bloque.find('a[href*="/pizarra/"]').first();
    const href = link.attr("href");
    if (!href) return;

    const slug = slugDesdeHref(href);
    const nombre = link.text().trim();

    $bloque.find("span.caja-resultado[data-texto]").each((__, span) => {
      const momento = $(span).attr("data-texto");
      const turno = momento ? MOMENTO_A_TURNO[momento] : undefined;
      if (!turno) return;

      const texto = $(span).text().trim();
      const numero = /^\d{4}$/.test(texto) ? texto : null;

      resultados.push({
        jurisdiccionSlug: slug,
        jurisdiccionNombre: nombre,
        turno,
        numero,
      });
    });
  });

  return { fecha, resultados };
}
