"use server";

import { getResultadosPorFecha } from "@/lib/queries";
import { esFechaValida } from "@/lib/fechas";
import { TURNOS_ORDEN, TurnoKey } from "@/lib/turnos";
import {
  controlarPremio,
  esAlcanceValido,
  esNumeroJugadoValido,
  calcularPremioEstimado,
  CalculoPremio,
  ResultadoControlPremio,
} from "@/lib/premio";

export interface ControlPremioInput {
  fecha: string;
  jurisdiccionSlug: string;
  turno: TurnoKey;
  numeroJugado: string;
  alcance: number;
  importe?: number; // opcional — si se indica y ganó, se estima el premio
}

export interface ControlPremioOutput extends ResultadoControlPremio {
  numerosDelTurno: (string | null)[];
  nombreJurisdiccion: string;
  calculo: CalculoPremio | null; // null si no ganó o no se indicó importe
}

export async function controlarPremioAction(
  input: ControlPremioInput
): Promise<ControlPremioOutput> {
  const { fecha, jurisdiccionSlug, turno, numeroJugado, alcance, importe } = input;

  if (!esFechaValida(fecha)) throw new Error("Fecha inválida");
  if (!TURNOS_ORDEN.includes(turno)) throw new Error("Turno inválido");
  if (!esAlcanceValido(alcance)) throw new Error("El alcance debe ser un número entre 1 y 10");
  if (!esNumeroJugadoValido(numeroJugado)) {
    throw new Error("El número jugado debe tener 2, 3 o 4 cifras");
  }
  if (importe !== undefined && (!Number.isFinite(importe) || importe <= 0)) {
    throw new Error("El importe apostado tiene que ser mayor a 0");
  }

  const filas = await getResultadosPorFecha(fecha);
  const fila = filas.find((f) => f.slug === jurisdiccionSlug);
  if (!fila) throw new Error("Jurisdicción inválida");

  const numerosDelTurno = fila.porTurno[turno];
  if (numerosDelTurno.every((n) => n === null)) {
    throw new Error(
      `No hay resultados guardados para ${fila.nombre} el ${fecha} — revisá que la fecha sea correcta`
    );
  }

  const resultado = controlarPremio(numeroJugado, numerosDelTurno, alcance);
  const calculo =
    resultado.gano && importe
      ? calcularPremioEstimado(importe, resultado.cifras, alcance)
      : null;

  return { ...resultado, numerosDelTurno, nombreJurisdiccion: fila.nombre, calculo };
}
