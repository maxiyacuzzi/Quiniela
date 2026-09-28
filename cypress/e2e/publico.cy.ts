describe("Páginas públicas", () => {
  it("la home carga", () => {
    cy.visit("/");
    cy.get("body").should("be.visible");
  });

  it("/sorteos carga", () => {
    cy.request("/sorteos").its("status").should("eq", 200);
  });

  it("/controlar-premio carga", () => {
    cy.visit("/controlar-premio");
    cy.get("body").should("be.visible");
  });

  it("/gestion sin sesión redirige al login", () => {
    cy.visit("/gestion");
    cy.location("pathname").should("include", "/gestion/login");
  });

  it("/gestion/caja/resumen sin sesión redirige al login", () => {
    cy.visit("/gestion/caja/resumen");
    cy.location("pathname").should("include", "/gestion/login");
  });
});
