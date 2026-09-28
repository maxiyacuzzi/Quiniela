"use server";

import { asegurarUltimoSorteoBrinco } from "@/lib/brinco/historial";
import { getSorteoBrincoPorFecha } from "@/lib/brinco/queries";
import { MODALIDADES_ORDEN } from "@/lib/brinco/modalidades";
import { controlarBrinco, esNumeroBrincoValido, AciertosModalidadBrinco } from "@/lib/brinco/premio";
import { esFechaValida } from "@/lib/fechas";

export interface ControlBrincoOutput {
  sorteo: string | null;
  resultados: AciertosModalidadBrinco[];
}

export async function controlarJugadaBrincoAction(
  fecha: string,
  numeros: string[]
): Promise<ControlBrincoOutput> {
  if (!esFechaValida(fecha)) throw new Error("Fecha inválida");
  if (numeros.length !== 6 || numeros.some((n) => !esNumeroBrincoValido(n))) {
    throw new Error("Tenés que elegir 6 números válidos (00 a 39)");
  }

  // Nos aseguramos de tener el último sorteo por si la fecha pedida es la más
  // reciente y todavía no se guardó (Brinco no admite pedir una fecha puntual).
  await asegurarUltimoSorteoBrinco();

  const sorteo = await getSorteoBrincoPorFecha(fecha);
  const disponible = MODALIDADES_ORDEN.every((m) => sorteo.modalidades[m].length === 6);
  if (!disponible) throw new Error(`No hay sorteo de Brinco guardado para el ${fecha}`);

  const resultados = controlarBrinco(numeros, sorteo.modalidades);
  return { sorteo: sorteo.sorteo, resultados };
}
