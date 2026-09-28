"use server";

import { asegurarFechaLoto } from "@/lib/loto/historial";
import { getSorteoLotoPorFecha, SorteoLoto } from "@/lib/loto/queries";
import { obtenerFechasSorteoLoto, FechaSorteoLoto } from "@/lib/loto/scraper";

export interface ObtenerSorteoLotoOutput extends SorteoLoto {
  disponible: boolean;
  fechas: FechaSorteoLoto[];
}

// Sin fecha: trae el último sorteo conocido (los sorteos son solo miércoles y
// sábado, así que no tiene sentido pedir "hoy" a secas).
export async function obtenerSorteoLotoAction(fecha?: string): Promise<ObtenerSorteoLotoOutput> {
  const fechas = await obtenerFechasSorteoLoto();
  const fechaObjetivo = fecha ?? fechas[fechas.length - 1]?.fecha;

  if (!fechaObjetivo) {
    return {
      fecha: "",
      sorteo: null,
      modalidades: { tradicional: [], match: [], desquite: [], sale_o_sale: [] },
      disponible: false,
      fechas,
    };
  }

  const { disponible } = await asegurarFechaLoto(fechaObjetivo);
  const sorteo = await getSorteoLotoPorFecha(fechaObjetivo);

  return { ...sorteo, disponible, fechas };
}
