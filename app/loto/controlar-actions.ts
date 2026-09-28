"use server";

import { asegurarFechaLoto } from "@/lib/loto/historial";
import { getSorteoLotoPorFecha } from "@/lib/loto/queries";
import { controlarLoto, esNumeroLotoValido, AciertosModalidadLoto } from "@/lib/loto/premio";
import { esFechaValida } from "@/lib/fechas";

export interface ControlLotoOutput {
  sorteo: string | null;
  resultados: AciertosModalidadLoto[];
}

export async function controlarJugadaLotoAction(
  fecha: string,
  numeros: string[]
): Promise<ControlLotoOutput> {
  if (!esFechaValida(fecha)) throw new Error("Fecha inválida");
  if (numeros.length !== 6 || numeros.some((n) => !esNumeroLotoValido(n))) {
    throw new Error("Tenés que elegir 6 números válidos (00 a 45)");
  }

  const { disponible } = await asegurarFechaLoto(fecha);
  if (!disponible) throw new Error(`No hay sorteo de Loto para el ${fecha}`);

  const sorteo = await getSorteoLotoPorFecha(fecha);
  const resultados = controlarLoto(numeros, sorteo.modalidades);
  return { sorteo: sorteo.sorteo, resultados };
}
