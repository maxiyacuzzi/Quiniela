import { obtenerClienteGemini, MODELO_GEMINI, TIMEOUT_GEMINI_MS } from "./gemini";
import { JURISDICCIONES } from "./jurisdicciones";
import { TURNOS_ORDEN } from "./turnos";
import { TipoControlPremio } from "./premio";
import { getFechaHoyArgentina } from "./fechas";

const SLUGS_JURISDICCION = JURISDICCIONES.map((j) => j.slug);
const ENUM_JURISDICCION = [...SLUGS_JURISDICCION, "desconocido"];
const ENUM_TURNO = [...TURNOS_ORDEN, "desconocido"];

export interface JugadaExtraida {
  fecha: string; // YYYY-MM-DD, o "desconocida"
  jurisdiccion: string; // uno de ENUM_JURISDICCION
  turno: string; // uno de ENUM_TURNO
  numeroJugado: string;
  tipo: TipoControlPremio;
}

function construirPrompt(hoy: string): string {
  return `Sos un asistente que lee fotos de tickets de apuestas de quiniela argentina (los emite una agencia con una impresora térmica). Un ticket puede tener una o varias jugadas juntas.

Hoy es ${hoy}. Los tickets son de una jugada reciente (de hoy o de los últimos días) — nunca de años anteriores. Si el ticket imprime el año con 2 dígitos, con un formato ambiguo, o borroso, interpretalo como el año más cercano a hoy (ej. "26" o un "6" poco claro es 2026, no 2024 ni otro año viejo). Prestá especial atención a no confundir dígitos parecidos como 4/6 o 8/6 en el año.

Para CADA jugada que identifiques en la foto, devolvé un objeto con:

- fecha: la fecha de la jugada tal como figura impresa en el ticket, en formato YYYY-MM-DD. Si no la podés leer con confianza, poné el texto "desconocida".
- jurisdiccion: una de estas opciones EXACTAS: ${SLUGS_JURISDICCION.join(", ")}, desconocido. Mapeá nombres o abreviaturas comunes del ticket a estas opciones (ej: "CABA"/"Cap"/"Ciudad" -> ciudad; "Bs As"/"PBA"/"Pcia"/"Buenos Aires"/"Provincia" -> provincia; "Cba"/"Córdoba" -> cordoba; "Sta Fe"/"SF"/"Santa Fe" -> santa-fe; "ER"/"Entre Ríos" -> entre-rios). Muchos tickets en vez de un nombre imprimen un código "Lot: N" (a veces con varios números juntos, uno por cada jurisdicción jugada, ej. "Lot: 1.2.3.4.5") — para ese código usá este mapeo exacto: 1 -> ciudad, 2 -> provincia, 3 -> cordoba, 4 -> santa-fe, 5 -> entre-rios. Si en un ticket aparecen varios números de "Lot" juntos, es UNA jugada por cada jurisdicción de esa lista (mismo número, mismo turno, mismo tipo), no una sola. Si no está claro, poné "desconocido".
- turno: uno de: ${TURNOS_ORDEN.join(", ")}, desconocido.
- numeroJugado: el número apostado, solo dígitos, entre 2 y 4 cifras (sin el importe apostado ni otros datos).
- tipo: "cabeza" si la apuesta es a la cabeza (la más común — usá este valor por defecto si no está claro), o "cualquiera" si es a que el número salga en cualquiera de las 10 posiciones del turno.

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
                tipo: { type: "string", enum: ["cabeza", "cualquiera"] },
              },
              required: ["fecha", "jurisdiccion", "turno", "numeroJugado", "tipo"],
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
