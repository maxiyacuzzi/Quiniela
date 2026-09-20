import { obtenerClienteGemini, MODELO_GEMINI } from "../gemini";

export interface JugadaQuini6Extraida {
  fecha: string; // YYYY-MM-DD, o "desconocida"
  numeros: string[]; // idealmente 6 números, "00" a "45"
}

const PROMPT = `Sos un asistente que lee fotos de tickets de Quini 6 argentino (los emite una agencia con una impresora térmica). Un ticket puede tener una o varias líneas jugadas juntas (distintos grupos de 6 números).

Para CADA línea/jugada que identifiques en la foto, devolvé un objeto con:

- fecha: la fecha del sorteo tal como figura impresa en el ticket, en formato YYYY-MM-DD. Si no la podés leer con confianza, poné el texto "desconocida".
- numeros: la lista de los 6 números elegidos en esa línea, cada uno como string de 2 dígitos ("00" a "45"). Si no podés leer los 6 con confianza, devolvé los que sí puedas leer (puede ser una lista incompleta).

Devolvé todas las líneas/jugadas que encuentres en el ticket.`;

export async function leerTicketQuini6(
  imagenBase64: string,
  mimeType: string
): Promise<JugadaQuini6Extraida[]> {
  const client = obtenerClienteGemini();

  const response = await client.models.generateContent({
    model: MODELO_GEMINI,
    contents: [
      {
        role: "user",
        parts: [{ text: PROMPT }, { inlineData: { mimeType, data: imagenBase64 } }],
      },
    ],
    config: {
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
