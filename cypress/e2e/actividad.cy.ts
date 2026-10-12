import type { DatosPrueba, ActividadFiltro } from "../support/db";

// "Actividad reciente" en /gestion/jugadas mezcla a todos los clientes reales
// (últimos 30), así que el cliente de prueba se busca por nombre para acotar
// antes de mirar qué filtros quedaron (nunca se asume que es "el primero").
describe("Filtros de Actividad reciente (/gestion/jugadas)", () => {
  let datos: DatosPrueba;
  let actividad: ActividadFiltro;

  before(() => {
    cy.task<DatosPrueba>("db:preparar").then((d) => (datos = d));
    cy.task<ActividadFiltro>("db:sembrarActividadFiltro").then((a) => (actividad = a));
  });
  after(() => {
    cy.task("db:limpiarActividadFiltro", actividad);
    cy.task("db:limpiar", datos);
  });

  beforeEach(() => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/jugadas");
    cy.get('input[placeholder*="Buscar por cliente"]').type("TMP ACTIVIDAD Filtro");
  });

  it("la búsqueda acota a la jugada y al premio del cliente", () => {
    cy.contains("Jugada (Quiniela): Quiniela");
    cy.contains("Premio (Quini 6): premio test filtro");
  });

  it('"Jugadas" oculta el premio', () => {
    cy.contains("Actividad reciente").parent().contains("button", "Jugadas").click();
    cy.contains("Jugada (Quiniela): Quiniela");
    cy.contains("Premio (Quini 6): premio test filtro").should("not.exist");
  });

  it('"Premios" oculta la jugada', () => {
    cy.contains("Actividad reciente").parent().contains("button", "Premios").click();
    cy.contains("Premio (Quini 6): premio test filtro");
    cy.contains("Jugada (Quiniela): Quiniela").should("not.exist");
  });

  it("el filtro por juego acota a uno solo", () => {
    cy.get("[data-campo=actividad-juego]").select("quini6");
    cy.contains("Premio (Quini 6): premio test filtro");
    cy.contains("Jugada (Quiniela): Quiniela").should("not.exist");
  });

  it('"Pendiente" muestra la jugada fiada y no el premio ya pagado', () => {
    cy.get("[data-campo=actividad-estado]").select("pendiente");
    cy.contains("Jugada (Quiniela): Quiniela");
    cy.contains("Premio (Quini 6): premio test filtro").should("not.exist");
  });

  it('"Liquidado" muestra el premio pagado y no la jugada fiada', () => {
    cy.get("[data-campo=actividad-estado]").select("liquidado");
    cy.contains("Premio (Quini 6): premio test filtro");
    cy.contains("Jugada (Quiniela): Quiniela").should("not.exist");
  });

  // El cliente de prueba se siembra con creado_en = ahora, así que cae en
  // "Hoy", "Esta semana", "Este mes" y en la fecha puntual de hoy.
  it('"Hoy" vuelve a pedir al servidor y sigue mostrando lo sembrado ahora', () => {
    cy.get("[data-campo=actividad-fecha]").select("hoy");
    cy.contains("Jugada (Quiniela): Quiniela");
    cy.contains("Premio (Quini 6): premio test filtro");
  });

  it('"Esta semana" y "Este mes" también lo muestran', () => {
    cy.get("[data-campo=actividad-fecha]").select("semana");
    cy.contains("Jugada (Quiniela): Quiniela");
    cy.get("[data-campo=actividad-fecha]").select("mes");
    cy.contains("Jugada (Quiniela): Quiniela");
  });

  it("un día puntual sin nada esa fecha no muestra la actividad de hoy", () => {
    cy.get("[data-campo=actividad-fecha]").select("puntual");
    cy.get("[data-campo=actividad-fecha-puntual]").clear().type("2026-01-05");
    cy.contains("No hay actividad que cumpla con ese filtro.");
    cy.contains("Jugada (Quiniela): Quiniela").should("not.exist");
  });

  it('volver a "Cualquier fecha" trae de nuevo lo sembrado ahora', () => {
    cy.get("[data-campo=actividad-fecha]").select("hoy");
    cy.get("[data-campo=actividad-fecha]").select("todas");
    cy.contains("Jugada (Quiniela): Quiniela");
  });
});
