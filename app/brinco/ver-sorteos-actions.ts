"use server";

import { asegurarUltimoSorteoBrinco } from "@/lib/brinco/historial";
import { getSorteoBrincoPorFecha, obtenerFechasGuardadasBrinco, SorteoBrinco, FechaSorteoBrinco } from "@/lib/brinco/queries";
import { MODALIDADES_ORDEN, modalidadesVacias } from "@/lib/brinco/modalidades";

export interface ObtenerSorteoBrincoOutput extends SorteoBrinco {
  disponible: boolean;
  fechas: FechaSorteoBrinco[];
}

// Sin fecha: nos aseguramos de tener el último sorteo guardado (Brinco no
// admite pedirle a la fuente una fecha puntual, así que solo se refresca acá)
// y mostramos el más reciente que tengamos en la base.
export async function obtenerSorteoBrincoAction(fecha?: string): Promise<ObtenerSorteoBrincoOutput> {
  if (!fecha) {
    await asegurarUltimoSorteoBrinco();
  }

  const fechas = await obtenerFechasGuardadasBrinco();
  const fechaObjetivo = fecha ?? fechas[fechas.length - 1]?.fecha;

  if (!fechaObjetivo) {
    return { fecha: "", sorteo: null, modalidades: modalidadesVacias(), disponible: false, fechas };
  }

  const sorteo = await getSorteoBrincoPorFecha(fechaObjetivo);
  const disponible = MODALIDADES_ORDEN.every((m) => sorteo.modalidades[m].length === 6);

  return { ...sorteo, disponible, fechas };
}
