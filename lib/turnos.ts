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
