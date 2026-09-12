import { TurnoKey } from "./turnos";
import { JURISDICCIONES } from "./jurisdicciones";

const BASE_URL = "https://vivitusuerte.com";
const CANTIDAD_NUMEROS = 10;

// La página usa momento_5=Previa, momento_1=Primera, momento_2=Matutina,
// momento_3=Vespertina, momento_4=Nocturna (verificado contra /pizarra/ciudad).
const MOMENTO_A_TURNO: Record<string, TurnoKey> = {
  "5": "previa",
  "1": "primera",
  "2": "matutina",
  "3": "vespertina",
  "4": "nocturna",
};

export interface ResultadoScrapeado {
  jurisdiccionSlug: string;
  turno: TurnoKey;
  posicion: number; // 1..10 (posición 1 = "la cabeza")
  numero: string | null;
}

export interface ScrapeResult {
  fecha: string; // YYYY-MM-DD
  resultados: ResultadoScrapeado[];
  disponible: boolean; // false si la fuente no tiene datos para esta fecha (fuera de rango, o sin sorteo ese día)
}

interface PizarrasApiResponse {
  error: number;
  datos: Record<string, Record<string, string>>;
}

async function scrapearPizarra(
  jurisdiccionSlug: string,
  pizarraPath: string,
  fecha: string
): Promise<{ disponible: boolean; resultados: ResultadoScrapeado[] }> {
  // "+" es parte literal del nombre en la URL (ej. "santa+fe"), hay que
  // mandarlo codificado como %2B o el endpoint lo interpreta como espacio.
  const urlParam = encodeURIComponent(pizarraPath);
  const url = `${BASE_URL}/api/juegos/pizarras?fecha=${fecha}&url=${urlParam}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; quiniela-app/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`No se pudo descargar ${url}: HTTP ${res.status}`);
  }

  const json = (await res.json()) as PizarrasApiResponse;
  if (json.error !== 0) {
    return { disponible: false, resultados: [] };
  }

  const resultados: ResultadoScrapeado[] = [];

  for (const [momento, valores] of Object.entries(json.datos ?? {})) {
    const turno = MOMENTO_A_TURNO[momento];
    if (!turno) continue;

    for (let posicion = 1; posicion <= CANTIDAD_NUMEROS; posicion++) {
      const texto = valores[`momento_dato_${posicion}`];
      resultados.push({
        jurisdiccionSlug,
        turno,
        posicion,
        numero: texto && /^\d{4}$/.test(texto) ? texto : null,
      });
    }
  }

  return { disponible: true, resultados };
}

export async function scrapeCabezas(fecha: string): Promise<ScrapeResult> {
  const paginas = await Promise.all(
    JURISDICCIONES.map((j) => scrapearPizarra(j.slug, j.pizarraPath, fecha))
  );

  const disponible = paginas.some((p) => p.disponible);

  return {
    fecha,
    disponible,
    resultados: paginas.flatMap((p) => p.resultados),
  };
}
