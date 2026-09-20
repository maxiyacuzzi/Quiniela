// Formato que espera WhatsApp para Argentina: 54 + 9 + código de área (sin el 0) + número (sin el 15).
export const NUMERO_WHATSAPP_AGENCIA = "5493574408820";

export function linkWhatsapp(mensaje: string): string {
  return `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP_AGENCIA}&text=${encodeURIComponent(mensaje)}`;
}
