"use server";

import { leerTicketQuini6 } from "@/lib/quini6/ticket";
import { esFechaValida } from "@/lib/fechas";
import { esNumeroQuini6Valido, AciertosModalidad } from "@/lib/quini6/premio";
import { controlarJugadaQuini6Action } from "./controlar-actions";

export interface JugadaTicketQuini6 {
  fecha: string | null;
  fechaTexto: string;
  numeros: string[] | null; // normalizados, solo si son 6 válidos y sin repetir
  numerosTexto: string[];
}

export interface ResultadoJugadaTicketQuini6 {
  extraido: JugadaTicketQuini6;
  valido: boolean;
  motivoInvalido?: string;
  sorteo?: string | null;
  resultados?: AciertosModalidad[];
}

export async function procesarTicketQuini6Action(
  imagenBase64: string,
  mimeType: string
): Promise<ResultadoJugadaTicketQuini6[]> {
  const jugadasCrudas = await leerTicketQuini6(imagenBase64, mimeType);

  const resultados: ResultadoJugadaTicketQuini6[] = [];

  for (const cruda of jugadasCrudas) {
    const numerosNormalizados = cruda.numeros.map((n) => n.padStart(2, "0"));
    const numerosValidos =
      numerosNormalizados.length === 6 &&
      numerosNormalizados.every((n) => esNumeroQuini6Valido(n)) &&
      new Set(numerosNormalizados).size === 6;

    const fecha = esFechaValida(cruda.fecha) ? cruda.fecha : null;

    const extraido: JugadaTicketQuini6 = {
      fecha,
      fechaTexto: cruda.fecha,
      numeros: numerosValidos ? numerosNormalizados : null,
      numerosTexto: cruda.numeros,
    };

    if (!fecha || !numerosValidos) {
      resultados.push({
        extraido,
        valido: false,
        motivoInvalido: "No pudimos leer bien esta jugada — revisá los datos manualmente.",
      });
      continue;
    }

    try {
      const control = await controlarJugadaQuini6Action(fecha, numerosNormalizados);
      resultados.push({
        extraido,
        valido: true,
        sorteo: control.sorteo,
        resultados: control.resultados,
      });
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
