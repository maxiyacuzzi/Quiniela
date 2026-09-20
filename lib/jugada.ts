import { JURISDICCIONES } from "./jurisdicciones";
import { TURNO_LABEL, TURNOS_ORDEN, TurnoKey } from "./turnos";
import { TipoControlPremio } from "./premio";
import { formatearFechaLegible } from "./fechas";

export interface ItemJugada {
  numeroJugado: string;
  importe: number;
  tipo: TipoControlPremio;
}

export interface DatosJugada {
  fecha: string; // YYYY-MM-DD
  jurisdiccionSlugs: string[];
  turnos: TurnoKey[];
  items: ItemJugada[];
}

const NOMBRE_JURISDICCION: Record<string, string> = Object.fromEntries(
  JURISDICCIONES.map((j) => [j.slug, j.nombre])
);

function formatearImporte(importe: number): string {
  return importe.toLocaleString("es-AR", { minimumFractionDigits: 0 });
}

function textoTipo(tipo: TipoControlPremio): string {
  return tipo === "cabeza" ? "a la cabeza" : "primeros 10";
}

export function formatearMensajeJugada(datos: DatosJugada): string {
  const quinielas = datos.jurisdiccionSlugs
    .map((slug) => NOMBRE_JURISDICCION[slug] ?? slug)
    .join(", ");
  const turnos = TURNOS_ORDEN.filter((t) => datos.turnos.includes(t))
    .map((t) => TURNO_LABEL[t])
    .join(", ");
  const total = datos.items.reduce((acc, item) => acc + item.importe, 0);

  const lineasNumeros = datos.items.map(
    (item) => `  ${item.numeroJugado} - ${textoTipo(item.tipo)} - $${formatearImporte(item.importe)}`
  );

  return [
    "🎲 *Jugada*",
    `📅 Fecha: ${formatearFechaLegible(datos.fecha)}`,
    `🎯 Quiniela${datos.jurisdiccionSlugs.length > 1 ? "s" : ""}: ${quinielas}`,
    `🕐 Turno${datos.turnos.length > 1 ? "s" : ""}: ${turnos}`,
    "Números:",
    ...lineasNumeros,
    `💵 Total: $${formatearImporte(total)}`,
  ].join("\n");
}
