import type { DatosPrueba } from "./db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Inicia sesión en /gestion con el usuario temporal (la sesión se cachea). */
      login(datos: DatosPrueba, rol: "dueno" | "empleado"): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", (datos, rol) => {
  const email = rol === "dueno" ? datos.duenoEmail : datos.empleadoEmail;
  cy.session(
    [rol, email],
    () => {
      cy.visit("/gestion/login");
      cy.get("input[type=email]").type(email);
      cy.get("input[type=password]").type(datos.password, { log: false });
      cy.get("button[type=submit]").click();
      cy.location("pathname").should("not.include", "/login");
    },
    { cacheAcrossSpecs: false }
  );
});
