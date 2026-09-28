export type ModalidadBrinco = "tradicional" | "junior";

export const MODALIDADES_ORDEN: ModalidadBrinco[] = ["tradicional", "junior"];

export const MODALIDAD_LABEL: Record<ModalidadBrinco, string> = {
  tradicional: "Tradicional",
  junior: "Junior",
};

export function modalidadesVacias(): Record<ModalidadBrinco, string[]> {
  return { tradicional: [], junior: [] };
}
