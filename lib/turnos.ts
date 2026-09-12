export type TurnoKey = "previa" | "primera" | "matutina" | "vespertina" | "nocturna";

// El HTML fuente numera los turnos como "momento_1".."momento_5", pero el orden real
// (verificado en /pizarra/ciudad) es: momento_5=Previa, momento_1=Primera, momento_2=Matutina,
// momento_3=Vespertina, momento_4=Nocturna.
export const MOMENTO_A_TURNO: Record<string, TurnoKey> = {
  momento_5: "previa",
  momento_1: "primera",
  momento_2: "matutina",
  momento_3: "vespertina",
  momento_4: "nocturna",
};

export const TURNOS_ORDEN: TurnoKey[] = [
  "previa",
  "primera",
  "matutina",
  "vespertina",
  "nocturna",
];

export const TURNO_LABEL: Record<TurnoKey, string> = {
  previa: "La Previa",
  primera: "Primera",
  matutina: "Matutina",
  vespertina: "Vespertina",
  nocturna: "Nocturna",
};

// La página de "pizarra" rotula cada tabla con el nombre del turno en texto
// (a diferencia de "cabezas", que usa el índice momento_N) — lo normalizamos acá.
export function normalizeTurnoLabel(label: string): TurnoKey | null {
  const limpio = label.trim().toLowerCase();

  if (limpio.includes("previa")) return "previa";
  if (limpio.includes("primera")) return "primera";
  if (limpio.includes("matutina")) return "matutina";
  if (limpio.includes("vespertina")) return "vespertina";
  if (limpio.includes("nocturna")) return "nocturna";
  return null;
}
