import { GoogleGenAI } from "@google/genai";

export const MODELO_GEMINI = "gemini-flash-latest";

export function obtenerClienteGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno");
  return new GoogleGenAI({ apiKey });
}
