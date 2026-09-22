import { GoogleGenAI } from "@google/genai";

// Flash-Lite es más rápido que Flash a secas — importa porque las funciones
// de Netlify tienen un tope duro de ~30s por request (límite del API Gateway
// de AWS, ni siquiera Netlify lo puede subir para invocaciones HTTP normales).
export const MODELO_GEMINI = "gemini-flash-lite-latest";

// Deja margen para que el resto del request (leer el body, guardar en
// Supabase, armar la respuesta) entre dentro de ese tope de ~30s.
export const TIMEOUT_GEMINI_MS = 22_000;

export function obtenerClienteGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno");
  return new GoogleGenAI({ apiKey });
}
