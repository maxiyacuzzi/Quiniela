import { ModalidadBrinco, MODALIDADES_ORDEN } from "./modalidades";

export function esNumeroBrincoValido(numero: string): boolean {
  if (!/^\d{1,2}$/.test(numero)) return false;
  const n = Number(numero);
  return n >= 0 && n <= 39;
}

export interface AciertosModalidadBrinco {
  modalidad: ModalidadBrinco;
  numerosCoincidentes: string[];
  aciertos: number;
}

export function controlarBrinco(
  numerosJugados: string[],
  resultadosPorModalidad: Record<ModalidadBrinco, string[]>
): AciertosModalidadBrinco[] {
  const jugados = new Set(numerosJugados.map((n) => n.padStart(2, "0")));

  return MODALIDADES_ORDEN.map((modalidad) => {
    const numeros = resultadosPorModalidad[modalidad];
    const numerosCoincidentes = numeros.filter((n) => jugados.has(n));
    return { modalidad, numerosCoincidentes, aciertos: numerosCoincidentes.length };
  });
}
