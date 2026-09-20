export type ModalidadQuini6 = "tradicional_1" | "tradicional_2" | "revancha" | "siempre_sale";

export const MODALIDADES_ORDEN: ModalidadQuini6[] = [
  "tradicional_1",
  "tradicional_2",
  "revancha",
  "siempre_sale",
];

export const MODALIDAD_LABEL: Record<ModalidadQuini6, string> = {
  tradicional_1: "Tradicional (1ra vuelta)",
  tradicional_2: "Tradicional (2da vuelta)",
  revancha: "La Revancha",
  siempre_sale: "Siempre Sale",
};

export function modalidadesVacias(): Record<ModalidadQuini6, string[]> {
  return { tradicional_1: [], tradicional_2: [], revancha: [], siempre_sale: [] };
}
