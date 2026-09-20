"use server";

import { leerTicket } from "@/lib/ticket";
import { esFechaValida, getFechaHoyArgentina } from "@/lib/fechas";
import { JURISDICCIONES } from "@/lib/jurisdicciones";
import { TURNOS_ORDEN, TurnoKey } from "@/lib/turnos";
import { controlarPremioAction, ControlPremioOutput } from "./actions";

export interface JugadaTicket {
  fecha: string | null;
  jurisdiccionSlug: string | null;
  jurisdiccionTexto: string;
  turno: TurnoKey | null;
  turnoTexto: string;
  numeroJugado: string | null;
  tipo: "cabeza" | "cualquiera";
}

export interface ResultadoJugadaTicket {
  extraido: JugadaTicket;
  valido: boolean;
  motivoInvalido?: string;
  control?: ControlPremioOutput;
}

const SLUGS_VALIDOS = new Set(JURISDICCIONES.map((j) => j.slug));

export async function procesarTicketAction(
  imagenBase64: string,
  mimeType: string
): Promise<ResultadoJugadaTicket[]> {
  const jugadasCrudas = await leerTicket(imagenBase64, mimeType);
  const hoy = getFechaHoyArgentina();

  const resultados: ResultadoJugadaTicket[] = [];

  for (const cruda of jugadasCrudas) {
    const fecha = esFechaValida(cruda.fecha) ? cruda.fecha : hoy;
    const jurisdiccionSlug = SLUGS_VALIDOS.has(cruda.jurisdiccion) ? cruda.jurisdiccion : null;
    const turno = (TURNOS_ORDEN as string[]).includes(cruda.turno)
      ? (cruda.turno as TurnoKey)
      : null;
    const numeroJugado = /^\d{2,4}$/.test(cruda.numeroJugado) ? cruda.numeroJugado : null;

    const extraido: JugadaTicket = {
      fecha,
      jurisdiccionSlug,
      jurisdiccionTexto: cruda.jurisdiccion,
      turno,
      turnoTexto: cruda.turno,
      numeroJugado,
      tipo: cruda.tipo,
    };

    if (!jurisdiccionSlug || !turno || !numeroJugado) {
      resultados.push({
        extraido,
        valido: false,
        motivoInvalido: "No pudimos leer bien esta jugada — revisá los datos manualmente.",
      });
      continue;
    }

    try {
      const control = await controlarPremioAction({
        fecha,
        jurisdiccionSlug,
        turno,
        numeroJugado,
        tipo: cruda.tipo,
      });
      resultados.push({ extraido, valido: true, control });
    } catch (err) {
      resultados.push({
        extraido,
        valido: false,
        motivoInvalido: err instanceof Error ? err.message : "Error al controlar esta jugada",
      });
    }
  }

  return resultados;
}
