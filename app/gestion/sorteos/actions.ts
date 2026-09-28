"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requerirPerfil } from "@/lib/perfil";
import { getResultadosPorFecha, FilaJurisdiccion } from "@/lib/queries";
import { esFechaValida } from "@/lib/fechas";
import { TURNOS_ORDEN, TurnoKey } from "@/lib/turnos";

function esNumeroResultadoValido(numero: string): boolean {
  return /^\d{4}$/.test(numero);
}

export async function obtenerResultadosParaEditarAction(fecha: string): Promise<FilaJurisdiccion[]> {
  await requerirPerfil();
  if (!esFechaValida(fecha)) throw new Error("Fecha inválida");
  return getResultadosPorFecha(fecha);
}

export interface CambioResultado {
  jurisdiccionSlug: string;
  turno: TurnoKey;
  posicion: number; // 1..10
  numero: string | null; // null para dejarlo vacío
}

// Corrige a mano uno o más números de un turno puntual — por ejemplo cuando
// la fuente publicó algo mal. Una vez que la posición tiene cualquier valor
// (aunque sea este cargado a mano), el scraper automático ya no la vuelve a
// tocar (ver lib/historial.ts: solo re-scrapea si falta algún valor).
export async function guardarResultadosAction(
  fecha: string,
  cambios: CambioResultado[]
): Promise<void> {
  await requerirPerfil();
  if (!esFechaValida(fecha)) throw new Error("Fecha inválida");
  if (cambios.length === 0) return;

  for (const c of cambios) {
    if (!TURNOS_ORDEN.includes(c.turno)) throw new Error("Turno inválido");
    if (!Number.isInteger(c.posicion) || c.posicion < 1 || c.posicion > 10) {
      throw new Error("Posición inválida");
    }
    if (c.numero !== null && !esNumeroResultadoValido(c.numero)) {
      throw new Error(`Número inválido: "${c.numero}" (tiene que tener 4 cifras, o dejarlo vacío)`);
    }
  }

  const supabase = getSupabaseAdmin();
  const filas = cambios.map((c) => ({
    jurisdiccion_slug: c.jurisdiccionSlug,
    turno: c.turno,
    posicion: c.posicion,
    numero: c.numero,
    fecha,
  }));

  const { error } = await supabase
    .from("resultados")
    .upsert(filas, { onConflict: "jurisdiccion_slug,turno,posicion,fecha" });

  if (error) throw new Error(`Error al guardar los resultados: ${error.message}`);
}
