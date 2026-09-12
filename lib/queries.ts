import { getSupabaseAdmin } from "./supabase";
import { TurnoKey } from "./turnos";

export interface FilaJurisdiccion {
  slug: string;
  nombre: string;
  porTurno: Record<TurnoKey, string | null>;
}

export async function getUltimaFecha(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("resultados")
    .select("fecha")
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Error al buscar la última fecha: ${error.message}`);
  return data?.fecha ?? null;
}

export async function getFechasDisponibles(limite = 30): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("resultados")
    .select("fecha")
    .order("fecha", { ascending: false });

  if (error) throw new Error(`Error al listar fechas: ${error.message}`);

  const fechas = Array.from(new Set((data ?? []).map((r) => r.fecha as string)));
  return fechas.slice(0, limite);
}

export async function getResultadosPorFecha(fecha: string): Promise<FilaJurisdiccion[]> {
  const supabase = getSupabaseAdmin();

  const [{ data: jurisdicciones, error: errJ }, { data: resultados, error: errR }] =
    await Promise.all([
      supabase.from("jurisdicciones").select("slug, nombre, orden").order("orden"),
      supabase.from("resultados").select("jurisdiccion_slug, turno, numero").eq("fecha", fecha),
    ]);

  if (errJ) throw new Error(`Error al listar jurisdicciones: ${errJ.message}`);
  if (errR) throw new Error(`Error al listar resultados: ${errR.message}`);

  const porJurisdiccion = new Map<string, Record<TurnoKey, string | null>>();

  for (const r of resultados ?? []) {
    const actual = porJurisdiccion.get(r.jurisdiccion_slug) ?? ({} as Record<TurnoKey, string | null>);
    actual[r.turno as TurnoKey] = r.numero;
    porJurisdiccion.set(r.jurisdiccion_slug, actual);
  }

  return (jurisdicciones ?? []).map((j) => ({
    slug: j.slug,
    nombre: j.nombre,
    porTurno: porJurisdiccion.get(j.slug) ?? ({} as Record<TurnoKey, string | null>),
  }));
}
