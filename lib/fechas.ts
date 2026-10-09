const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires";

export function getFechaHoyArgentina(): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_ARGENTINA }).format(new Date());
}

export function getHoraActualArgentina(): number {
  const hora = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_ARGENTINA,
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  return Number(hora) % 24; // a las 24hs Intl devuelve "24", lo normalizamos a 0
}

export function esFechaValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

export function formatearFechaLegible(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export function restarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - dias);
  return date.toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number): string {
  return restarDias(fecha, -dias);
}

// 0 = domingo ... 6 = sábado. `fecha` ya es un día calendario (no un
// instante), así que se parsea en UTC a propósito para no depender de en qué
// huso corre el proceso.
export function diaDeLaSemana(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
