import { ModalidadBrinco, modalidadesVacias } from "./modalidades";

// A diferencia de vivitusuerte (fuente de Quini6/Loto), esta API no admite pedir
// una fecha puntual: siempre devuelve el último sorteo disponible. Por eso Brinco
// no tiene backfill — la base se va completando sorteo a sorteo desde que se usa.
const API_URL = "https://numerosenvivo.com.ar/api/juegos/brinco";

interface BrincoModalidadApi {
  numeros?: string[];
}

interface BrincoApiResponse {
  fecha?: string;
  nSorteo?: string;
  tradicional?: BrincoModalidadApi;
  junior?: BrincoModalidadApi;
}

export interface ScrapeBrincoResult {
  fecha: string;
  sorteo: string | null;
  disponible: boolean;
  modalidades: Record<ModalidadBrinco, string[]>;
}

function normalizarNumero(n: string): string {
  return n.padStart(2, "0");
}

export async function scrapeBrinco(): Promise<ScrapeBrincoResult> {
  const res = await fetch(API_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; quiniela-app/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`No se pudo descargar ${API_URL}: HTTP ${res.status}`);
  }

  const json = (await res.json()) as BrincoApiResponse;

  if (!json.fecha) {
    return { fecha: "", sorteo: null, disponible: false, modalidades: modalidadesVacias() };
  }

  const modalidades = modalidadesVacias();
  let disponible = true;

  for (const modalidad of ["tradicional", "junior"] as ModalidadBrinco[]) {
    const numeros = (json[modalidad]?.numeros ?? [])
      .filter((n): n is string => !!n && /^\d{1,2}$/.test(n))
      .map(normalizarNumero);
    modalidades[modalidad] = numeros;
    if (numeros.length !== 6) disponible = false;
  }

  return { fecha: json.fecha, sorteo: json.nSorteo ?? null, disponible, modalidades };
}
