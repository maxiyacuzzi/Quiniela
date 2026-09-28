"use server";

import { leerTicketBrinco } from "@/lib/brinco/ticket";
import { esFechaValida } from "@/lib/fechas";
import { esNumeroBrincoValido, AciertosModalidadBrinco } from "@/lib/brinco/premio";
import { controlarJugadaBrincoAction } from "./controlar-actions";

export interface JugadaTicketBrinco {
  fecha: string | null;
  fechaTexto: string;
  numeros: string[] | null; // normalizados, solo si son 6 válidos y sin repetir
  numerosTexto: string[];
}

export interface ResultadoJugadaTicketBrinco {
  extraido: JugadaTicketBrinco;
  valido: boolean;
  motivoInvalido?: string;
  sorteo?: string | null;
  resultados?: AciertosModalidadBrinco[];
}

export async function procesarTicketBrincoAction(
  imagenBase64: string,
  mimeType: string
): Promise<ResultadoJugadaTicketBrinco[]> {
  const jugadasCrudas = await leerTicketBrinco(imagenBase64, mimeType);

  const resultados: ResultadoJugadaTicketBrinco[] = [];

  for (const cruda of jugadasCrudas) {
    const numerosNormalizados = cruda.numeros.map((n) => n.padStart(2, "0"));
    const numerosValidos =
      numerosNormalizados.length === 6 &&
      numerosNormalizados.every((n) => esNumeroBrincoValido(n)) &&
      new Set(numerosNormalizados).size === 6;

    const fecha = esFechaValida(cruda.fecha) ? cruda.fecha : null;

    const extraido: JugadaTicketBrinco = {
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
      const control = await controlarJugadaBrincoAction(fecha, numerosNormalizados);
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
