"use server";

import { getResultadosPorFecha } from "@/lib/queries";
import { esFechaValida } from "@/lib/fechas";
import { TURNOS_ORDEN, TurnoKey } from "@/lib/turnos";
import {
  controlarPremio,
  esNumeroJugadoValido,
  ResultadoControlPremio,
  TipoControlPremio,
} from "@/lib/premio";

export interface ControlPremioInput {
  fecha: string;
  jurisdiccionSlug: string;
  turno: TurnoKey;
  numeroJugado: string;
  tipo: TipoControlPremio;
}

export interface ControlPremioOutput extends ResultadoControlPremio {
  numerosDelTurno: (string | null)[];
  nombreJurisdiccion: string;
}

export async function controlarPremioAction(
  input: ControlPremioInput
): Promise<ControlPremioOutput> {
  const { fecha, jurisdiccionSlug, turno, numeroJugado, tipo } = input;

  if (!esFechaValida(fecha)) throw new Error("Fecha inválida");
  if (!TURNOS_ORDEN.includes(turno)) throw new Error("Turno inválido");
  if (tipo !== "cabeza" && tipo !== "cualquiera") throw new Error("Tipo de control inválido");
  if (!esNumeroJugadoValido(numeroJugado)) {
    throw new Error("El número jugado debe tener 2, 3 o 4 cifras");
  }

  const filas = await getResultadosPorFecha(fecha);
  const fila = filas.find((f) => f.slug === jurisdiccionSlug);
  if (!fila) throw new Error("Jurisdicción inválida");

  const numerosDelTurno = fila.porTurno[turno];
  const resultado = controlarPremio(numeroJugado, numerosDelTurno, tipo);

  return { ...resultado, numerosDelTurno, nombreJurisdiccion: fila.nombre };
}
