import { getSupabaseAdmin } from "./supabase";
import { TurnoKey, TURNOS_ORDEN } from "./turnos";

export interface FilaJurisdiccion {
  slug: string;
  nombre: string;
  porTurno: Record<TurnoKey, (string | null)[]>; // índice 0 = posición 1 = "la cabeza"
}

function turnoVacio(): Record<TurnoKey, (string | null)[]> {
  const vacio = {} as Record<TurnoKey, (string | null)[]>;
  for (const t of TURNOS_ORDEN) vacio[t] = new Array(10).fill(null);
  return vacio;
}

export async function getResultadosPorFecha(fecha: string): Promise<FilaJurisdiccion[]> {
  const supabase = getSupabaseAdmin();

  const [{ data: jurisdicciones, error: errJ }, { data: resultados, error: errR }] =
    await Promise.all([
      supabase.from("jurisdicciones").select("slug, nombre, orden").order("orden"),
      supabase
        .from("resultados")
        .select("jurisdiccion_slug, turno, posicion, numero")
        .eq("fecha", fecha),
    ]);

  if (errJ) throw new Error(`Error al listar jurisdicciones: ${errJ.message}`);
  if (errR) throw new Error(`Error al listar resultados: ${errR.message}`);

  const porJurisdiccion = new Map<string, Record<TurnoKey, (string | null)[]>>();

  for (const r of resultados ?? []) {
    const actual = porJurisdiccion.get(r.jurisdiccion_slug) ?? turnoVacio();
    const lista = actual[r.turno as TurnoKey];
    if (lista && r.posicion >= 1 && r.posicion <= lista.length) {
      lista[r.posicion - 1] = r.numero;
    }
    porJurisdiccion.set(r.jurisdiccion_slug, actual);
  }

  return (jurisdicciones ?? []).map((j) => ({
    slug: j.slug,
    nombre: j.nombre,
    porTurno: porJurisdiccion.get(j.slug) ?? turnoVacio(),
  }));
}
