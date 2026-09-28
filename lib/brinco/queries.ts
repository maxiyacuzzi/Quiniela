import { getSupabaseAdmin } from "../supabase";
import { ModalidadBrinco, modalidadesVacias } from "./modalidades";

export interface SorteoBrinco {
  fecha: string;
  sorteo: string | null;
  modalidades: Record<ModalidadBrinco, string[]>;
}

export interface FechaSorteoBrinco {
  fecha: string;
  sorteo: string;
}

export async function getSorteoBrincoPorFecha(fecha: string): Promise<SorteoBrinco> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("brinco_resultados")
    .select("modalidad, numeros, sorteo")
    .eq("fecha", fecha);

  if (error) throw new Error(`Error al leer Brinco del ${fecha}: ${error.message}`);

  const modalidades = modalidadesVacias();
  let sorteo: string | null = null;

  for (const fila of data ?? []) {
    modalidades[fila.modalidad as ModalidadBrinco] = fila.numeros;
    sorteo = fila.sorteo;
  }

  return { fecha, sorteo, modalidades };
}

// A diferencia de Quini6/Loto (donde la fuente da un calendario completo de
// fechas con sorteo), acá el único registro de fechas pasadas es nuestra
// propia base — Brinco no tiene backfill, así que se arma sola con el tiempo.
export async function obtenerFechasGuardadasBrinco(): Promise<FechaSorteoBrinco[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("brinco_resultados")
    .select("fecha, sorteo")
    .order("fecha", { ascending: true });

  if (error) throw new Error(`Error al leer las fechas de Brinco: ${error.message}`);

  const vistos = new Set<string>();
  const fechas: FechaSorteoBrinco[] = [];
  for (const fila of data ?? []) {
    if (vistos.has(fila.fecha)) continue;
    vistos.add(fila.fecha);
    fechas.push({ fecha: fila.fecha, sorteo: fila.sorteo ?? "" });
  }

  return fechas;
}
