import { getSupabaseAdmin } from "../supabase";
import { ModalidadQuini6, modalidadesVacias } from "./modalidades";

export interface SorteoQuini6 {
  fecha: string;
  sorteo: string | null;
  modalidades: Record<ModalidadQuini6, string[]>;
}

export async function getSorteoQuini6PorFecha(fecha: string): Promise<SorteoQuini6> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("quini6_resultados")
    .select("modalidad, numeros, sorteo")
    .eq("fecha", fecha);

  if (error) throw new Error(`Error al leer Quini 6 del ${fecha}: ${error.message}`);

  const modalidades = modalidadesVacias();
  let sorteo: string | null = null;

  for (const fila of data ?? []) {
    modalidades[fila.modalidad as ModalidadQuini6] = fila.numeros;
    sorteo = fila.sorteo;
  }

  return { fecha, sorteo, modalidades };
}
