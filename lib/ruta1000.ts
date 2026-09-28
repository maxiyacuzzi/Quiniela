// Fuente de respaldo para cruzar "casos raros" (valores mal formados, turnos
// faltantes) contra vivitusuerte.com. No se usa como fuente principal: no
// tiene una API con fecha arbitraria, solo un listado de las últimas ~100
// jugadas (~20 días) por jurisdicción, en HTML viejo (años 2000, Latin-1).

export type JurisdiccionRuta1000 = "ciudad" | "provincia" | "cordoba" | "santa-fe" | "entre-rios";

const PARAM_POR_JURISDICCION: Record<JurisdiccionRuta1000, string> = {
  ciudad: "Quiniela_Nacional",
  provincia: "Quiniela_Buenos_Aires",
  cordoba: "Quiniela_Cordoba",
  "santa-fe": "Quiniela_Santa_Fe",
  "entre-rios": "Quiniela_Entre_Rios",
};

const HORA_A_TURNO: Record<string, string> = {
  "10:15": "previa",
  "12:00": "primera",
  "15:00": "matutina",
  "18:00": "vespertina",
  "21:00": "nocturna",
};

export interface SorteoRuta1000 {
  fecha: string; // YYYY-MM-DD
  turno: string;
  numeros: string[]; // 20 números, el primero es la cabeza
  letras: string;
}

function fechaAIso(fechaDDMMYYYY: string): string {
  const [d, m, y] = fechaDDMMYYYY.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// La página está en Latin-1 (ISO-8859-1), no UTF-8 — hay que decodificarla
// a mano o los acentos (Sábado, Córdoba, etc.) salen mal.
export async function obtenerSorteosRuta1000(
  jurisdiccion: JurisdiccionRuta1000
): Promise<SorteoRuta1000[]> {
  const param = PARAM_POR_JURISDICCION[jurisdiccion];
  const url = `https://www.ruta1000.com.ar/index2008.php?Resultado=${param}_Sorteos_Anteriores`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; quiniela-app/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo descargar ${url}: HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();
  const html = new TextDecoder("iso-8859-1").decode(buffer);

  // Algunas jurisdicciones (Ciudad) traen una columna extra de "Letras" al
  // final; otras (Buenos Aires, Córdoba, Santa Fe, Entre Ríos) no — por eso
  // ese grupo es opcional.
  const filaRegex =
    /<tr[^>]*>\s*<td>[^<]+<br>\s*(\d{1,2}\/\d{1,2}\/\d{4})<br>(\d{1,2}:\d{2})<\/td>((?:\s*<td>[^<]*<\/td>){20})\s*(?:<td>([^<]*)<\/td>\s*)?<\/tr>/g;
  const celdaRegex = /<td>([^<]*)<\/td>/g;

  const sorteos: SorteoRuta1000[] = [];
  let match: RegExpExecArray | null;

  while ((match = filaRegex.exec(html))) {
    const [, fechaStr, hora, celdas, letras] = match;
    const turno = HORA_A_TURNO[hora];
    if (!turno) continue;

    const numeros: string[] = [];
    celdaRegex.lastIndex = 0;
    let celdaMatch: RegExpExecArray | null;
    while ((celdaMatch = celdaRegex.exec(celdas))) {
      numeros.push(celdaMatch[1].trim());
    }
    if (numeros.length !== 20) continue;

    sorteos.push({ fecha: fechaAIso(fechaStr), turno, numeros, letras: letras?.trim() ?? "" });
  }

  return sorteos;
}
