"use server";

import { leerTicketLoto } from "@/lib/loto/ticket";
import { esFechaValida } from "@/lib/fechas";
import { esNumeroLotoValido, AciertosModalidadLoto } from "@/lib/loto/premio";
import { controlarJugadaLotoAction } from "./controlar-actions";

export interface JugadaTicketLoto {
  fecha: string | null;
  fechaTexto: string;
  numeros: string[] | null; // normalizados, solo si son 6 válidos y sin repetir
  numerosTexto: string[];
}

export interface ResultadoJugadaTicketLoto {
  extraido: JugadaTicketLoto;
  valido: boolean;
  motivoInvalido?: string;
  sorteo?: string | null;
  resultados?: AciertosModalidadLoto[];
}

export async function procesarTicketLotoAction(
  imagenBase64: string,
  mimeType: string
): Promise<ResultadoJugadaTicketLoto[]> {
  const jugadasCrudas = await leerTicketLoto(imagenBase64, mimeType);

  const resultados: ResultadoJugadaTicketLoto[] = [];

  for (const cruda of jugadasCrudas) {
    const numerosNormalizados = cruda.numeros.map((n) => n.padStart(2, "0"));
    const numerosValidos =
      numerosNormalizados.length === 6 &&
      numerosNormalizados.every((n) => esNumeroLotoValido(n)) &&
      new Set(numerosNormalizados).size === 6;

    const fecha = esFechaValida(cruda.fecha) ? cruda.fecha : null;

    const extraido: JugadaTicketLoto = {
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
      const control = await controlarJugadaLotoAction(fecha, numerosNormalizados);
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
