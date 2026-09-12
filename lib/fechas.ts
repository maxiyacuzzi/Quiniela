const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires";

export function getFechaHoyArgentina(): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_ARGENTINA }).format(new Date());
}

export function esFechaValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

export function restarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - dias);
  return date.toISOString().slice(0, 10);
}
