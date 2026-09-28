// Alcance de la apuesta: a cuántas de las 10 posiciones del turno cubre.
// 1 = "a la cabeza" (solo la posición 1), 10 = "primeros 10" (cualquier
// posición). Los tickets reales imprimen este número tal cual ("Alcance: N").
export const ALCANCE_MINIMO = 1;
export const ALCANCE_MAXIMO = 10;

export interface CoincidenciaPremio {
  posicion: number; // 1..10 (1 = "la cabeza")
  numero: string;
}

export interface ResultadoControlPremio {
  gano: boolean;
  cifras: number;
  coincidencias: CoincidenciaPremio[];
}

export function esNumeroJugadoValido(numero: string): boolean {
  return /^\d{2,4}$/.test(numero);
}

export function esAlcanceValido(alcance: number): boolean {
  return Number.isInteger(alcance) && alcance >= ALCANCE_MINIMO && alcance <= ALCANCE_MAXIMO;
}

export function textoAlcance(alcance: number): string {
  if (alcance === 1) return "a la cabeza";
  if (alcance === ALCANCE_MAXIMO) return "primeros 10";
  return `primeros ${alcance}`;
}

// El número jugado tiene que coincidir con los últimos N dígitos de alguna de
// las primeras "alcance" posiciones del turno (posición 1 = la cabeza).
export function controlarPremio(
  numeroJugado: string,
  numeros: (string | null)[], // 10 elementos, índice 0 = posición 1 = "la cabeza"
  alcance: number
): ResultadoControlPremio {
  const cifras = numeroJugado.length;
  const candidatos = numeros.slice(0, alcance);

  const coincidencias: CoincidenciaPremio[] = [];
  candidatos.forEach((numero, i) => {
    if (numero && numero.slice(-cifras) === numeroJugado) {
      coincidencias.push({ posicion: i + 1, numero });
    }
  });

  return { gano: coincidencias.length > 0, cifras, coincidencias };
}

// Tabla de pago estándar de quiniela argentina "a la cabeza" (multiplicador
// por cada $1 apostado, según la cantidad de cifras jugadas).
// PROVISORIO — a confirmar contra la tarifa real de la agencia.
export const MULTIPLICADOR_POR_CIFRAS: Record<number, number> = {
  1: 7,
  2: 70,
  3: 600,
  4: 3500,
};

// Porcentaje que se descuenta del premio bruto antes de pagarlo — la
// retención de impuestos que la lotería aplica sobre los premios de
// Quiniela (esta función solo aplica a Quiniela, el único juego con sistema
// de cifras/alcance). Confirmado: 2%.
export const PORCENTAJE_IMPUESTOS = 2;

export interface CalculoPremio {
  multiplicador: number;
  premioBruto: number;
  impuestos: number;
  premioNeto: number;
}

// Estimación del premio a pagar: el multiplicador "a la cabeza" se reduce
// proporcionalmente según el alcance (cubrir más posiciones reparte el mismo
// premio entre más chances de acertar) — esta reducción por alcance sigue
// siendo PROVISORIA, a confirmar con la tarifa real de la agencia. Los
// impuestos (2%) ya están confirmados.
export function calcularPremioEstimado(
  importe: number,
  cifras: number,
  alcance: number
): CalculoPremio {
  const multiplicadorBase = MULTIPLICADOR_POR_CIFRAS[cifras] ?? 0;
  const multiplicador = multiplicadorBase / alcance;
  const premioBruto = Math.round(importe * multiplicador);
  const impuestos = Math.round(premioBruto * (PORCENTAJE_IMPUESTOS / 100));
  const premioNeto = premioBruto - impuestos;
  return { multiplicador, premioBruto, impuestos, premioNeto };
}
