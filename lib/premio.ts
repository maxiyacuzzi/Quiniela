export type TipoControlPremio = "cabeza" | "cualquiera";

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

// "cabeza": el número jugado tiene que coincidir con los últimos N dígitos de la
// posición 1 (la cabeza). "cualquiera": alcanza con que coincida con cualquiera
// de los 10 números del turno, en cualquier posición.
export function controlarPremio(
  numeroJugado: string,
  numeros: (string | null)[], // 10 elementos, índice 0 = posición 1 = "la cabeza"
  tipo: TipoControlPremio
): ResultadoControlPremio {
  const cifras = numeroJugado.length;
  const candidatos = tipo === "cabeza" ? numeros.slice(0, 1) : numeros;

  const coincidencias: CoincidenciaPremio[] = [];
  candidatos.forEach((numero, i) => {
    if (numero && numero.slice(-cifras) === numeroJugado) {
      coincidencias.push({ posicion: i + 1, numero });
    }
  });

  return { gano: coincidencias.length > 0, cifras, coincidencias };
}
