import { ModalidadQuini6, modalidadesVacias } from "./modalidades";

const BASE_URL = "https://vivitusuerte.com";

export interface FechaSorteoQuini6 {
  fecha: string;
  sorteo: string;
}

interface PoceadoApiResponse {
  error: number;
  fecha: string;
  datos: Record<string, string>;
  fechas?: FechaSorteoQuini6[];
}

export interface ScrapeQuini6Result {
  fecha: string; // YYYY-MM-DD pedida
  sorteo: string | null;
  disponible: boolean; // false si la fuente no tiene sorteo para esta fecha exacta
  modalidades: Record<ModalidadQuini6, string[]>;
}

// Posiciones "bN" del API para cada modalidad (ver /poceados/quini+6 en la fuente).
const GRUPOS: Record<ModalidadQuini6, string[]> = {
  tradicional_1: ["b1", "b2", "b3", "b4", "b5", "b6"],
  revancha: ["b7", "b8", "b9", "b10", "b11", "b12"],
  siempre_sale: ["b13", "b14", "b15", "b16", "b17", "b18"],
  tradicional_2: ["b19", "b20", "b21", "b22", "b23", "b24"],
};

function normalizarNumero(n: string): string {
  return n.padStart(2, "0");
}

async function pedirPoceado(fecha: string): Promise<PoceadoApiResponse> {
  const url = `${BASE_URL}/api/juegos/poceado?fecha=${fecha}&url=${encodeURIComponent("quini+6")}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; quiniela-app/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`No se pudo descargar ${url}: HTTP ${res.status}`);
  }

  return (await res.json()) as PoceadoApiResponse;
}

export async function scrapeQuini6(fecha: string): Promise<ScrapeQuini6Result> {
  const json = await pedirPoceado(fecha);
  const datos = json.datos;

  // La fuente devuelve el último sorteo disponible si la fecha pedida todavía no
  // tiene sorteo (fuera de rango o día sin sorteo) — solo lo damos por "disponible"
  // si la fecha efectiva coincide con la pedida.
  if (json.error !== 0 || !datos || datos.fecha !== fecha) {
    return { fecha, sorteo: null, disponible: false, modalidades: modalidadesVacias() };
  }

  const modalidades = modalidadesVacias();
  let disponible = true;

  for (const [modalidad, campos] of Object.entries(GRUPOS) as [ModalidadQuini6, string[]][]) {
    const numeros = campos
      .map((c) => datos[c])
      .filter((n): n is string => !!n && /^\d{1,2}$/.test(n))
      .map(normalizarNumero);
    modalidades[modalidad] = numeros;
    if (numeros.length !== 6) disponible = false;
  }

  return { fecha, sorteo: datos.sorteo ?? null, disponible, modalidades };
}

// Los sorteos son solo miércoles y domingo (con feriados salteados), así que en vez
// de un calendario libre navegamos por esta lista real de fechas con sorteo,
// ordenada de más vieja a más nueva.
export async function obtenerFechasSorteoQuini6(): Promise<FechaSorteoQuini6[]> {
  const hoy = new Date().toISOString().slice(0, 10);
  const json = await pedirPoceado(hoy);
  return json.fechas ?? [];
}
