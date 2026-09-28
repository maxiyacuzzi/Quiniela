import { obtenerClienteGemini, MODELO_GEMINI, TIMEOUT_GEMINI_MS } from "./gemini";
import { JURISDICCIONES } from "./jurisdicciones";
import { TURNOS_ORDEN } from "./turnos";
import { getFechaHoyArgentina } from "./fechas";

const SLUGS_JURISDICCION = JURISDICCIONES.map((j) => j.slug);
const ENUM_JURISDICCION = [...SLUGS_JURISDICCION, "desconocido"];
const ENUM_TURNO = [...TURNOS_ORDEN, "desconocido"];

export interface JugadaExtraida {
  fecha: string; // YYYY-MM-DD, o "desconocida"
  jurisdiccion: string; // uno de ENUM_JURISDICCION
  turno: string; // uno de ENUM_TURNO
  numeroJugado: string;
  alcance: number; // 1 a 10 — a cuántas posiciones cubre la apuesta
  importe: number | null; // monto apostado en esa jugada, si se puede leer
}

function construirPrompt(hoy: string): string {
  return `Sos un asistente que lee fotos de tickets de apuestas de quiniela argentina (los emite una agencia con una impresora térmica). Un ticket puede tener una o varias jugadas juntas.

Hoy es ${hoy}. Los tickets son de una jugada reciente (de hoy o de los últimos días) — nunca de años anteriores. Si el ticket imprime el año con 2 dígitos, con un formato ambiguo, o borroso, interpretalo como el año más cercano a hoy (ej. "26" o un "6" poco claro es 2026, no 2024 ni otro año viejo). Prestá especial atención a no confundir dígitos parecidos como 4/6 o 8/6 en el año.

Para CADA jugada que identifiques en la foto, devolvé un objeto con:

- fecha: la fecha de la jugada tal como figura impresa en el ticket, en formato YYYY-MM-DD. Si no la podés leer con confianza, poné el texto "desconocida".
- jurisdiccion: una de estas opciones EXACTAS: ${SLUGS_JURISDICCION.join(", ")}, desconocido. Mapeá nombres o abreviaturas comunes del ticket a estas opciones (ej: "CABA"/"Cap"/"Ciudad" -> ciudad; "Bs As"/"PBA"/"Pcia"/"Buenos Aires"/"Provincia" -> provincia; "Cba"/"Córdoba" -> cordoba; "Sta Fe"/"SF"/"Santa Fe" -> santa-fe; "ER"/"Entre Ríos" -> entre-rios). Muchos tickets en vez de un nombre imprimen un código "Lot: N" (a veces con varios números juntos, uno por cada jurisdicción jugada, ej. "Lot: 1.2.3.4.5") — para ese código usá este mapeo exacto: 1 -> ciudad, 2 -> provincia, 3 -> cordoba, 4 -> santa-fe, 5 -> entre-rios. Si en un ticket aparecen varios números de "Lot" juntos, es UNA jugada por cada jurisdicción de esa lista (mismo número, mismo turno, mismo tipo), no una sola. Si no está claro, poné "desconocido".
- turno: uno de: ${TURNOS_ORDEN.join(", ")}, desconocido.
- numeroJugado: el número apostado, solo dígitos, entre 2 y 4 cifras (sin el importe apostado ni otros datos).
- alcance: un número entero del 1 al 10 — a cuántas posiciones cubre la apuesta. Los tickets suelen imprimir este dato como "Alcance: N". Alcance 1 significa "a la cabeza" (la más común — usá este valor por defecto si no está claro). Alcance 10 significa que gana si el número sale en cualquiera de las 10 posiciones del turno. Cualquier valor intermedio (2 a 9) significa que gana si el número sale en cualquiera de las primeras N posiciones.
- importe: el monto apostado en esa jugada puntual, solo el número (sin "$" ni otros símbolos). Si el ticket tiene varias jugadas con un importe total en vez de uno por jugada, o no lo podés leer con confianza, poné null.

Devolvé todas las jugadas que encuentres, una por cada combinación de número + turno + jurisdicción apostada en el ticket.`;
}

export async function leerTicket(
  imagenBase64: string,
  mimeType: string
): Promise<JugadaExtraida[]> {
  const client = obtenerClienteGemini();
  const prompt = construirPrompt(getFechaHoyArgentina());

  const response = await client.models.generateContent({
    model: MODELO_GEMINI,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imagenBase64 } },
        ],
      },
    ],
    config: {
      httpOptions: { timeout: TIMEOUT_GEMINI_MS },
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          jugadas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fecha: { type: "string" },
                jurisdiccion: { type: "string", enum: ENUM_JURISDICCION },
                turno: { type: "string", enum: ENUM_TURNO },
                numeroJugado: { type: "string" },
                alcance: { type: "integer" },
                importe: { type: "number", nullable: true },
              },
              required: ["fecha", "jurisdiccion", "turno", "numeroJugado", "alcance", "importe"],
            },
          },
        },
        required: ["jugadas"],
      },
    },
  });

  const texto = response.text;
  if (!texto) throw new Error("Gemini no devolvió contenido");

  const parsed = JSON.parse(texto) as { jugadas: JugadaExtraida[] };
  return parsed.jugadas ?? [];
}
