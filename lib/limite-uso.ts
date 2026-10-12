import { headers } from "next/headers";
import { getSupabaseAdmin } from "./supabase";

export class LimiteExcedidoError extends Error {}

// Netlify pone la IP real del cliente en este header; x-forwarded-for queda
// de respaldo para correr local o en otro hosting.
async function ipCliente(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-nf-client-connection-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocida"
  );
}

interface Cupo {
  max: number;
  ventanaSeg: number;
}

// Corta la server action si esta IP (o todo el sitio, para que rotar IPs no
// alcance) ya usó su cupo. Si la tabla todavía no existe o Supabase falla,
// deja pasar: preferimos no romper la página por el limitador.
export async function requerirCupo(
  accion: string,
  porIp: Cupo,
  global: Cupo,
  mensaje = "Demasiados intentos seguidos. Esperá unos minutos y probá de nuevo."
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const ip = await ipCliente();

  for (const [clave, cupo] of [
    [`${accion}:${ip}`, porIp],
    [`${accion}:global`, global],
  ] as const) {
    const { data, error } = await supabase.rpc("consumir_cupo", {
      p_clave: clave,
      p_max: cupo.max,
      p_ventana_seg: cupo.ventanaSeg,
    });
    if (error) {
      console.warn(`[limite-uso] no se pudo chequear ${clave}: ${error.message}`);
      return;
    }
    if (data === false) throw new LimiteExcedidoError(mensaje);
  }
}

const MIME_TICKET = new Set(["image/jpeg", "image/png", "image/webp"]);
// El cliente ya la achica a 1280px en JPEG (lib/image.ts), que queda muy
// por debajo de esto; el tope es para que nadie nos haga mandar 10MB a Gemini.
const MAX_BASE64_TICKET = 3 * 1024 * 1024;

// Validación + rate limit comunes a las cuatro lecturas de ticket con Gemini
// (quiniela, Quini 6, Loto, Brinco): cada llamada cuesta plata.
export async function validarTicketPublico(imagenBase64: string, mimeType: string): Promise<void> {
  if (typeof mimeType !== "string" || !MIME_TICKET.has(mimeType)) {
    throw new Error("Formato de imagen no soportado");
  }
  if (typeof imagenBase64 !== "string" || imagenBase64.length === 0) {
    throw new Error("No llegó la imagen");
  }
  if (imagenBase64.length > MAX_BASE64_TICKET) {
    throw new Error("La imagen es demasiado grande");
  }
  await requerirCupo(
    "ticket",
    { max: 10, ventanaSeg: 10 * 60 },
    { max: 300, ventanaSeg: 60 * 60 }
  );
}
