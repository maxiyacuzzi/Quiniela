export interface JurisdiccionConfig {
  slug: string; // id interno, usado en la base
  nombre: string; // nombre para mostrar en la UI
  pizarraPath: string; // fragmento tal como lo espera vivitusuerte.com/pizarra/<esto>
}

// Solo estas 5 jurisdicciones se scrapean y se guardan (a pedido del usuario).
export const JURISDICCIONES: JurisdiccionConfig[] = [
  { slug: "ciudad", nombre: "Ciudad", pizarraPath: "ciudad" },
  { slug: "provincia", nombre: "Provincia", pizarraPath: "provincia" },
  { slug: "cordoba", nombre: "Córdoba", pizarraPath: "cordoba" },
  { slug: "entre-rios", nombre: "Entre Ríos", pizarraPath: "entre+rios" },
  { slug: "santa-fe", nombre: "Santa Fé", pizarraPath: "santa+fe" },
];
