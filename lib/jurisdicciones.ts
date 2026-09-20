export interface JurisdiccionConfig {
  slug: string; // id interno, usado en la base
  nombre: string; // nombre para mostrar en la UI
  pizarraPath: string; // fragmento tal como lo espera la fuente en su URL de pizarra
}

// Solo estas 5 jurisdicciones se scrapean y se guardan (a pedido del usuario).
export const JURISDICCIONES: JurisdiccionConfig[] = [
  { slug: "ciudad", nombre: "Ciudad", pizarraPath: "ciudad" },
  { slug: "provincia", nombre: "Buenos Aires", pizarraPath: "provincia" },
  { slug: "cordoba", nombre: "Córdoba", pizarraPath: "cordoba" },
  { slug: "santa-fe", nombre: "Santa Fé", pizarraPath: "santa+fe" },
  { slug: "entre-rios", nombre: "Entre Ríos", pizarraPath: "entre+rios" },
];
