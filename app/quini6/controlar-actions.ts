"use server";

import { asegurarFechaQuini6 } from "@/lib/quini6/historial";
import { getSorteoQuini6PorFecha } from "@/lib/quini6/queries";
import { controlarQuini6, esNumeroQuini6Valido, AciertosModalidad } from "@/lib/quini6/premio";
import { esFechaValida } from "@/lib/fechas";

export interface ControlQuini6Output {
  sorteo: string | null;
  resultados: AciertosModalidad[];
}

export async function controlarJugadaQuini6Action(
  fecha: string,
  numeros: string[]
): Promise<ControlQuini6Output> {
  if (!esFechaValida(fecha)) throw new Error("Fecha inválida");
  if (numeros.length !== 6 || numeros.some((n) => !esNumeroQuini6Valido(n))) {
    throw new Error("Tenés que elegir 6 números válidos (00 a 45)");
  }

  const { disponible } = await asegurarFechaQuini6(fecha);
  if (!disponible) throw new Error(`No hay sorteo de Quini 6 para el ${fecha}`);

  const sorteo = await getSorteoQuini6PorFecha(fecha);
  const resultados = controlarQuini6(numeros, sorteo.modalidades);
  return { sorteo: sorteo.sorteo, resultados };
}
