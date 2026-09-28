import { formatearFechaLegible } from "../fechas";

export interface DatosJugadaLoto {
  fecha: string; // YYYY-MM-DD
  numeros: string[]; // 6 números
}

export function formatearMensajeLoto(datos: DatosJugadaLoto): string {
  return [
    "🎰 *Jugada Loto*",
    `📅 Fecha: ${formatearFechaLegible(datos.fecha)}`,
    `Modalidades: Tradicional, Match, Desquite y Sale o Sale`,
    `🔢 Números: ${datos.numeros.join(" - ")}`,
  ].join("\n");
}
