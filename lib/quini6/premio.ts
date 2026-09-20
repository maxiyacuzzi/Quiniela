import { ModalidadQuini6, MODALIDADES_ORDEN } from "./modalidades";

export function esNumeroQuini6Valido(numero: string): boolean {
  if (!/^\d{1,2}$/.test(numero)) return false;
  const n = Number(numero);
  return n >= 0 && n <= 45;
}

export interface AciertosModalidad {
  modalidad: ModalidadQuini6;
  numerosCoincidentes: string[];
  aciertos: number;
}

export function controlarQuini6(
  numerosJugados: string[],
  resultadosPorModalidad: Record<ModalidadQuini6, string[]>
): AciertosModalidad[] {
  const jugados = new Set(numerosJugados.map((n) => n.padStart(2, "0")));

  return MODALIDADES_ORDEN.map((modalidad) => {
    const numeros = resultadosPorModalidad[modalidad];
    const numerosCoincidentes = numeros.filter((n) => jugados.has(n));
    return { modalidad, numerosCoincidentes, aciertos: numerosCoincidentes.length };
  });
}
