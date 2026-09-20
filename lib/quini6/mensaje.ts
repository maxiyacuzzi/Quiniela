import { formatearFechaLegible } from "../fechas";

export interface DatosJugadaQuini6 {
  fecha: string; // YYYY-MM-DD
  numeros: string[]; // 6 números
}

export function formatearMensajeQuini6(datos: DatosJugadaQuini6): string {
  return [
    "🎱 *Jugada Quini 6*",
    `📅 Fecha: ${formatearFechaLegible(datos.fecha)}`,
    `Modalidades: Tradicional, Revancha y Siempre Sale`,
    `🔢 Números: ${datos.numeros.join(" - ")}`,
  ].join("\n");
}
