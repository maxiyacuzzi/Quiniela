import type { DatosPrueba } from "../support/db";

interface ClientesFiltro {
  meDebe: string;
  leDebo: string;
  sinSaldo: string;
  inactivo: string;
}

// Clientes extra (independientes del cliente de prepararDatos) para poder
// probar los filtros y el orden de /gestion/clientes con los tres estados de
// saldo y un inactivo.
describe("Filtros de /gestion/clientes", () => {
  let datos: DatosPrueba;
  let clientesFiltro: ClientesFiltro;

  before(() => {
    cy.task<DatosPrueba>("db:preparar").then((d) => (datos = d));
    cy.task<ClientesFiltro>("db:sembrarClientesFiltro").then((c) => (clientesFiltro = c));
  });
  after(() => {
    cy.task("db:limpiarClientesFiltro", clientesFiltro);
    cy.task("db:limpiar", datos);
  });

  beforeEach(() => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/clientes");
  });

  it("por default muestra todos los activos", () => {
    cy.contains("TMP FILTRO Zeta (me debe)");
    cy.contains("TMP FILTRO Alfa (le debo)");
    cy.contains("TMP FILTRO Beta (sin saldo)");
    cy.contains("TMP FILTRO Omega (inactivo)").should("not.exist");
  });

  it('"Me deben" solo muestra a quienes deben', () => {
    cy.contains("button", "Me deben").click();
    cy.contains("TMP FILTRO Zeta (me debe)");
    cy.contains("TMP FILTRO Alfa (le debo)").should("not.exist");
    cy.contains("TMP FILTRO Beta (sin saldo)").should("not.exist");
  });

  it('"Les debo" solo muestra a quienes les debo', () => {
    cy.contains("button", "Les debo").click();
    cy.contains("TMP FILTRO Alfa (le debo)");
    cy.contains("TMP FILTRO Zeta (me debe)").should("not.exist");
    cy.contains("TMP FILTRO Beta (sin saldo)").should("not.exist");
  });

  it('"Sin saldo" solo muestra a los que están en cero', () => {
    cy.contains("button", "Sin saldo").click();
    cy.contains("TMP FILTRO Beta (sin saldo)");
    cy.contains("TMP FILTRO Zeta (me debe)").should("not.exist");
    cy.contains("TMP FILTRO Alfa (le debo)").should("not.exist");
  });

  it("destildar \"Solo activos\" muestra también al inactivo", () => {
    cy.contains("label", "Solo activos").find("input[type=checkbox]").uncheck();
    cy.contains("TMP FILTRO Omega (inactivo)");
  });

  // Hay clientes reales mezclados en la lista, así que para mirar el orden
  // hay que acotar a los de prueba primero (ninguno real se llama "TMP CLIENTE").
  it("ordena por abecedario y lo puede invertir", () => {
    cy.get('input[placeholder*="Buscar"]').type("TMP FILTRO");
    cy.get("ul li a p").first().should("contain", "TMP FILTRO Alfa");
    cy.get("select").last().select("nombre-za");
    cy.get("ul li a p").first().should("contain", "TMP FILTRO Zeta");
  });

  it("ordena por el que más debe primero", () => {
    cy.get('input[placeholder*="Buscar"]').type("TMP FILTRO");
    cy.get("select").last().select("mas-deuda");
    cy.get("ul li a p").first().should("contain", "TMP FILTRO Zeta");
  });

  it("la búsqueda se combina con el filtro", () => {
    cy.contains("button", "Me deben").click();
    cy.get('input[placeholder*="Buscar"]').type("Alfa");
    cy.contains("No hay clientes que cumplan con ese filtro.");
  });
});
