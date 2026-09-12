const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires";

export function getFechaHoyArgentina(): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_ARGENTINA }).format(new Date());
}

export function esFechaValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}
