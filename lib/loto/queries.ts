import { getSupabaseAdmin } from "../supabase";
import { ModalidadLoto, modalidadesVacias } from "./modalidades";

export interface SorteoLoto {
  fecha: string;
  sorteo: string | null;
  modalidades: Record<ModalidadLoto, string[]>;
}

export async function getSorteoLotoPorFecha(fecha: string): Promise<SorteoLoto> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("loto_resultados")
    .select("modalidad, numeros, sorteo")
    .eq("fecha", fecha);

  if (error) throw new Error(`Error al leer Loto del ${fecha}: ${error.message}`);

  const modalidades = modalidadesVacias();
  let sorteo: string | null = null;

  for (const fila of data ?? []) {
    modalidades[fila.modalidad as ModalidadLoto] = fila.numeros;
    sorteo = fila.sorteo;
  }

  return { fecha, sorteo, modalidades };
}
