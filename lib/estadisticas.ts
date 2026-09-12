import { getSupabaseAdmin } from "./supabase";

export interface Frecuente {
  numero: string;
  apariciones: number;
}

export interface Atrasado {
  numero: string;
  ultimaFecha: string;
  diasAtraso: number;
}

export interface EstadisticasCifras {
  cifras: number;
  masFrecuentes: Frecuente[];
  masAtrasados: Atrasado[];
}

const TOP_N = 5;
const CANTIDADES_CIFRAS = [2, 3, 4] as const;

export async function getEstadisticas(): Promise<EstadisticasCifras[]> {
  const supabase = getSupabaseAdmin();

  const resultados = await Promise.all(
    CANTIDADES_CIFRAS.map(async (cifras) => {
      const [{ data: frecuentes, error: errF }, { data: atrasados, error: errA }] =
        await Promise.all([
          supabase.rpc("top_frecuentes", { cifras, top_n: TOP_N }),
          supabase.rpc("top_atrasados", { cifras, top_n: TOP_N }),
        ]);

      if (errF) throw new Error(`Error en top_frecuentes(${cifras}): ${errF.message}`);
      if (errA) throw new Error(`Error en top_atrasados(${cifras}): ${errA.message}`);

      return {
        cifras,
        masFrecuentes: (frecuentes ?? []).map((r: { numero: string; apariciones: number }) => ({
          numero: r.numero,
          apariciones: Number(r.apariciones),
        })),
        masAtrasados: (atrasados ?? []).map(
          (r: { numero: string; ultima_fecha: string; dias_atraso: number }) => ({
            numero: r.numero,
            ultimaFecha: r.ultima_fecha,
            diasAtraso: Number(r.dias_atraso),
          })
        ),
      };
    })
  );

  return resultados;
}

export async function getRangoFechas(): Promise<{ desde: string; hasta: string } | null> {
  const supabase = getSupabaseAdmin();
  const [{ data: min }, { data: max }] = await Promise.all([
    supabase.from("resultados").select("fecha").order("fecha", { ascending: true }).limit(1),
    supabase.from("resultados").select("fecha").order("fecha", { ascending: false }).limit(1),
  ]);

  if (!min?.[0] || !max?.[0]) return null;
  return { desde: min[0].fecha, hasta: max[0].fecha };
}
