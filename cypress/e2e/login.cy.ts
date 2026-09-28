import type { DatosPrueba } from "../support/db";

describe("Login de /gestion", () => {
  let datos: DatosPrueba;

  before(() => {
    cy.task<DatosPrueba>("db:preparar").then((d) => (datos = d));
  });
  after(() => {
    cy.task("db:limpiar", datos);
  });

  it("rechaza una contraseña incorrecta", () => {
    cy.visit("/gestion/login");
    cy.get("input[type=email]").type(datos.duenoEmail);
    cy.get("input[type=password]").type("incorrecta-123");
    cy.get("button[type=submit]").click();
    cy.location("pathname").should("include", "/login");
  });

  it("el dueño entra a Gestión", () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion");
    cy.location("pathname").should("eq", "/gestion");
  });

  it("el empleado entra a la Caja", () => {
    cy.login(datos, "empleado");
    cy.visit("/gestion/caja");
    cy.contains("Caja");
    cy.contains("Resumen por día");
  });

  it("el empleado no ve Liquidación estimada ni Cuenta de premios", () => {
    cy.login(datos, "empleado");
    cy.visit("/gestion/caja");
    cy.contains("Resumen por día");
    cy.contains("Liquidación").should("not.exist");
    cy.contains("Cuenta de premios").should("not.exist");
  });

  it("el empleado no ve las columnas del dueño en el resumen", () => {
    cy.login(datos, "empleado");
    cy.visit("/gestion/caja/resumen");
    cy.contains("Efectivo (caja)");
    cy.contains("Cuenta de premios").should("not.exist");
    cy.contains("Neto lotería").should("not.exist");
  });

  it("el dueño sí ve las columnas del dueño en el resumen", () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/caja/resumen");
    cy.contains("Cuenta de premios (Córdoba)");
    cy.contains("Neto lotería");
  });
});
