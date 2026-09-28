import { defineConfig } from "cypress";
import reportePlugin from "cypress-mochawesome-reporter/plugin";
import { config } from "dotenv";
import path from "node:path";
import { prepararDatos, limpiarDatos, barrerRestos, consultarCliente, DatosPrueba } from "./cypress/support/db";

config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  // Reporte HTML autocontenido en cypress/reports/html/index.html (con capturas de los fallos).
  reporter: "cypress-mochawesome-reporter",
  reporterOptions: {
    reportDir: "cypress/reports",
    reportFilename: "index",
    reportPageTitle: "Reporte de tests E2E - Quiniela",
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: false,
  },
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on) {
      // Cypress se queda con un solo handler por evento: los juntamos para que
      // el plugin del reporte y la limpieza convivan.
      const handlers: Record<string, Array<(...args: unknown[]) => unknown>> = {};
      const onVarios = ((evento: string, fn: (...args: unknown[]) => unknown) => {
        (handlers[evento] ??= []).push(fn);
      }) as unknown as Cypress.PluginEvents;
      reportePlugin(onVarios);
      // Antes y después de cada corrida se barren los restos de pruebas
      // interrumpidas, así la base nunca queda con datos de prueba.
      onVarios("after:run", async () => {
        const r = await barrerRestos();
        if (r.usuarios || r.clientes) console.log(`Se limpiaron restos de pruebas: ${r.usuarios} usuarios, ${r.clientes} clientes`);
      });
      onVarios("before:run", async () => {
        const r = await barrerRestos();
        if (r.usuarios || r.clientes) console.log(`Se limpiaron restos de una corrida anterior: ${r.usuarios} usuarios, ${r.clientes} clientes`);
      });
      // Los tests usan la base real de Supabase, pero solo con datos propios:
      // usuarios temporales, un cliente "TMP" y una fecha vacía. Todo se borra al final.
      on("before:run", async (...args: unknown[]) => {
        for (const h of handlers["before:run"] ?? []) await h(...args);
      });
      on("after:run", async (...args: unknown[]) => {
        for (const h of handlers["after:run"] ?? []) await h(...args);
      });

      on("task", {
        "db:preparar": () => prepararDatos(),
        "db:limpiar": (datos: DatosPrueba) => limpiarDatos(datos).then(() => null),
        "db:barrer": () => barrerRestos(),
        "db:cliente": (clienteId: string) => consultarCliente(clienteId),
      });
    },
  },
});
