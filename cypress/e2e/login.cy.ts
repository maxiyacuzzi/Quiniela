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

  it("el empleado no puede cerrar (ni reabrir) la caja", () => {
    // No asume si el corte de hoy ya está cerrado o no: en ningún caso el
    // empleado tiene que ver un botón para cerrarlo o reabrirlo.
    cy.login(datos, "empleado");
    cy.visit("/gestion/caja");
    cy.contains("button", "Cerrar corte").should("not.exist");
    cy.contains("button", "Reabrir corte").should("not.exist");
  });

  it("el empleado no ve Liquidación estimada ni Cuenta de premios", () => {
    cy.login(datos, "empleado");
    cy.visit("/gestion/caja");
    cy.contains("Resumen por día");
    cy.contains("Liquidación").should("not.exist");
    cy.contains("Cuenta de premios").should("not.exist");
  });

  // La quiniela no sortea los domingos: lo del viernes y el sábado se
  // liquida junto en un solo memo real que llega el lunes (ver
  // lib/liquidacion.ts). El panel tiene que avisar cuando junta los dos días.
  const fechaLiquidacion = () =>
    cy.contains("Liquidación estimada").parent().parent().find('input[type=date]');

  it("la liquidación de un sábado se muestra junto con la del viernes", () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/caja");
    fechaLiquidacion().clear().type("2026-01-03"); // sábado
    cy.contains("Viernes 02/01/2026 + Sábado 03/01/2026, juntos");
  });

  it("la liquidación de un viernes se muestra sola", () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/caja");
    fechaLiquidacion().clear().type("2026-01-02"); // viernes
    cy.contains("juntos").should("not.exist");
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
