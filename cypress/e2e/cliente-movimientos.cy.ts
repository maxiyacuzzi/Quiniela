import type { DatosPrueba } from "../support/db";

// El cliente de la fixture tiene 3 movimientos: +$2.000 (jugada, sin medio),
// -$500 (premio, sin medio) y -$300 (cobro de deuda, efectivo) — saldo final
// $1.200. La página ahora tiene dos pestañas en vez de mostrar todo junto.
describe("Pestañas y filtros de /gestion/clientes/[id]", () => {
  let datos: DatosPrueba;

  before(() => {
    cy.task<DatosPrueba>("db:preparar").then((d) => (datos = d));
  });
  after(() => {
    cy.task("db:limpiar", datos);
  });

  beforeEach(() => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/clientes").then(() => {
      cy.get(`a[href="/gestion/clientes/${datos.clienteId}"]`).click();
    });
  });

  it('arranca en la pestaña "Jugadas y premios"', () => {
    cy.contains("Jugada (Quiniela): Quiniela");
    cy.contains("Movimientos").should("exist"); // el botón de la pestaña
    cy.contains("Cobro de deuda").should("not.exist"); // eso es de la otra pestaña
  });

  it('la pestaña "Movimientos" muestra el saldo y los tres movimientos', () => {
    cy.contains("button", "Movimientos").click();
    cy.contains("Te debe $1.200");
    cy.contains("Jugada (Quiniela)");
    cy.contains("Premio (Quiniela): x");
    cy.contains("Cobro de deuda");
  });

  it("la búsqueda en Movimientos acota por concepto", () => {
    cy.contains("button", "Movimientos").click();
    cy.get('input[placeholder*="Buscar por concepto"]').type("Cobro");
    cy.contains("Cobro de deuda");
    cy.contains("Jugada (Quiniela)").should("not.exist");
  });

  it('"Bajó la deuda" oculta la jugada (que la sube)', () => {
    cy.contains("button", "Movimientos").click();
    cy.contains("button", "Bajó la deuda").click();
    cy.contains("Premio (Quiniela): x");
    cy.contains("Cobro de deuda");
    cy.contains("Jugada (Quiniela)").should("not.exist");
  });

  it('"Sin medio" muestra la jugada y el premio, no el cobro', () => {
    cy.contains("button", "Movimientos").click();
    cy.get("[data-campo=movimientos-medio]").select("sin-medio");
    cy.contains("Jugada (Quiniela)");
    cy.contains("Premio (Quiniela): x");
    cy.contains("Cobro de deuda").should("not.exist");
  });

  it('el filtro de fecha "Hoy" no muestra nada (los movimientos son de otro día)', () => {
    cy.contains("button", "Movimientos").click();
    cy.get("[data-campo=movimientos-fecha]").select("hoy");
    cy.contains("No hay movimientos que cumplan con ese filtro.");
  });
});
