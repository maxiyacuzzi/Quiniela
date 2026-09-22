import { obtenerClienteGemini, MODELO_GEMINI, TIMEOUT_GEMINI_MS } from "../gemini";
import { getFechaHoyArgentina } from "../fechas";

export interface JugadaQuini6Extraida {
  fecha: string; // YYYY-MM-DD, o "desconocida"
  numeros: string[]; // idealmente 6 números, "00" a "45"
}

function construirPrompt(hoy: string): string {
  return `Sos un asistente que lee fotos de tickets de Quini 6 argentino (los emite una agencia con una impresora térmica). Un ticket puede tener una o varias líneas jugadas juntas (distintos grupos de 6 números).

Hoy es ${hoy}. Los tickets son de una jugada reciente (de hoy o de los últimos días) — nunca de años anteriores. Si el ticket imprime el año con 2 dígitos, con un formato ambiguo, o borroso, interpretalo como el año más cercano a hoy (ej. "26" o un "6" poco claro es 2026, no 2024 ni otro año viejo). Prestá especial atención a no confundir dígitos parecidos como 4/6 o 8/6 en el año.

Para CADA línea/jugada que identifiques en la foto, devolvé un objeto con:

- fecha: la fecha del sorteo tal como figura impresa en el ticket, en formato YYYY-MM-DD. Si no la podés leer con confianza, poné el texto "desconocida".
- numeros: la lista de los 6 números elegidos en esa línea, cada uno como string de 2 dígitos ("00" a "45"). Si no podés leer los 6 con confianza, devolvé los que sí puedas leer (puede ser una lista incompleta).

Devolvé todas las líneas/jugadas que encuentres en el ticket.`;
}

export async function leerTicketQuini6(
  imagenBase64: string,
  mimeType: string
): Promise<JugadaQuini6Extraida[]> {
  const client = obtenerClienteGemini();
  const prompt = construirPrompt(getFechaHoyArgentina());

  const response = await client.models.generateContent({
    model: MODELO_GEMINI,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, { inlineData: { mimeType, data: imagenBase64 } }],
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
                numeros: { type: "array", items: { type: "string" } },
              },
              required: ["fecha", "numeros"],
            },
          },
        },
        required: ["jugadas"],
      },
    },
  });

  const texto = response.text;
  if (!texto) throw new Error("Gemini no devolvió contenido");

  const parsed = JSON.parse(texto) as { jugadas: JugadaQuini6Extraida[] };
  return parsed.jugadas ?? [];
}
