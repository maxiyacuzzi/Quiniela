export type ModalidadLoto = "tradicional" | "match" | "desquite" | "sale_o_sale";

export const MODALIDADES_ORDEN: ModalidadLoto[] = [
  "tradicional",
  "match",
  "desquite",
  "sale_o_sale",
];

export const MODALIDAD_LABEL: Record<ModalidadLoto, string> = {
  tradicional: "Tradicional",
  match: "Match",
  desquite: "Desquite",
  sale_o_sale: "Sale o Sale",
};

export function modalidadesVacias(): Record<ModalidadLoto, string[]> {
  return { tradicional: [], match: [], desquite: [], sale_o_sale: [] };
}
