import type { DatosPrueba, ClienteDeuda } from "../support/db";

// Deuda a propósito enorme: así se diferencia sí o sí de cualquier deuda real
// de la agencia y queda primera en "Quién más te debe" sin importar el
// estado real de la base al momento de correr el test.
const DEUDA_ENORME = 99_999_999;

function hoyArgentina(): string {
  return new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

describe("/gestion/estadisticas", () => {
  let datos: DatosPrueba;
  let deudor: ClienteDeuda;

  before(() => {
    cy.task<DatosPrueba>("db:preparar").then((d) => (datos = d));
    cy.task<ClienteDeuda>("db:sembrarClienteDeuda", DEUDA_ENORME).then((c) => (deudor = c));
  });
  after(() => {
    cy.task("db:limpiarClienteDeuda", deudor);
    cy.task("db:limpiar", datos);
  });

  it("un empleado no ve el link y no puede entrar directo", () => {
    cy.login(datos, "empleado");
    cy.visit("/gestion");
    cy.contains("nav a", "Estadísticas").should("not.exist");
    cy.visit("/gestion/estadisticas");
    cy.location("pathname").should("eq", "/gestion");
  });

  it("el dueño ve el link, entra y ve las 4 secciones", () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion");
    cy.contains("nav a", "Estadísticas").click();
    cy.location("pathname").should("eq", "/gestion/estadisticas");
    cy.contains("h1", "Estadísticas");
    cy.contains("h2", "Ventas y liquidación estimada");
    cy.contains("h2", "Caja");
    cy.contains("h2", "Premios pagados");
    cy.contains("h2", "Clientes y deuda");
  });

  it('por default arranca en "Este mes"', () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/estadisticas");
    cy.contains("button", "Este mes").should("have.class", "bg-red-600");
  });

  it('"Hoy" muestra el rango de un solo día: hoy', () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/estadisticas");
    cy.contains("button", "Hoy").click();
    cy.contains("button", "Hoy").should("have.class", "bg-red-600");
    cy.contains("button", "Este mes").should("not.have.class", "bg-red-600");
    const hoy = hoyArgentina();
    cy.contains(`${hoy} – ${hoy}`);
  });

  it('el cliente con la deuda enorme aparece primero en "Quién más te debe"', () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/estadisticas");
    cy.contains("button", "Último año").click();
    cy.contains("h3", "Quién más te debe")
      .next("ul")
      .find("li")
      .first()
      .should("contain", "TMP DEUDA Cliente")
      .and("contain", "$99.999.999");
  });
});
