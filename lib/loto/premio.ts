import { ModalidadLoto, MODALIDADES_ORDEN } from "./modalidades";

export function esNumeroLotoValido(numero: string): boolean {
  if (!/^\d{1,2}$/.test(numero)) return false;
  const n = Number(numero);
  return n >= 0 && n <= 45;
}

export interface AciertosModalidadLoto {
  modalidad: ModalidadLoto;
  numerosCoincidentes: string[];
  aciertos: number;
}

export function controlarLoto(
  numerosJugados: string[],
  resultadosPorModalidad: Record<ModalidadLoto, string[]>
): AciertosModalidadLoto[] {
  const jugados = new Set(numerosJugados.map((n) => n.padStart(2, "0")));

  return MODALIDADES_ORDEN.map((modalidad) => {
    const numeros = resultadosPorModalidad[modalidad];
    const numerosCoincidentes = numeros.filter((n) => jugados.has(n));
    return { modalidad, numerosCoincidentes, aciertos: numerosCoincidentes.length };
  });
}
