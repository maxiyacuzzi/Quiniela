import { formatearFechaLegible } from "../fechas";

export interface DatosJugadaBrinco {
  fecha: string; // YYYY-MM-DD
  numeros: string[]; // 6 números
}

export function formatearMensajeBrinco(datos: DatosJugadaBrinco): string {
  return [
    "🐸 *Jugada Brinco*",
    `📅 Fecha: ${formatearFechaLegible(datos.fecha)}`,
    `Modalidades: Tradicional y Junior`,
    `🔢 Números: ${datos.numeros.join(" - ")}`,
  ].join("\n");
}
