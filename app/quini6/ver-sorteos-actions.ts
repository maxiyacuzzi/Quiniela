"use server";

import { asegurarFechaQuini6 } from "@/lib/quini6/historial";
import { getSorteoQuini6PorFecha, SorteoQuini6 } from "@/lib/quini6/queries";
import { obtenerFechasSorteoQuini6, FechaSorteoQuini6 } from "@/lib/quini6/scraper";

export interface ObtenerSorteoQuini6Output extends SorteoQuini6 {
  disponible: boolean;
  fechas: FechaSorteoQuini6[];
}

// Sin fecha: trae el último sorteo conocido (los sorteos son solo miércoles y
// domingo, así que no tiene sentido pedir "hoy" a secas).
export async function obtenerSorteoQuini6Action(fecha?: string): Promise<ObtenerSorteoQuini6Output> {
  const fechas = await obtenerFechasSorteoQuini6();
  const fechaObjetivo = fecha ?? fechas[fechas.length - 1]?.fecha;

  if (!fechaObjetivo) {
    return {
      fecha: "",
      sorteo: null,
      modalidades: {
        tradicional_1: [],
        tradicional_2: [],
        revancha: [],
        siempre_sale: [],
      },
      disponible: false,
      fechas,
    };
  }

  const { disponible } = await asegurarFechaQuini6(fechaObjetivo);
  const sorteo = await getSorteoQuini6PorFecha(fechaObjetivo);

  return { ...sorteo, disponible, fechas };
}
