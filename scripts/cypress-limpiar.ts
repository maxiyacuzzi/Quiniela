// Borra cualquier resto de datos de prueba de Cypress (usuarios tmp-cypress-*, cliente
// "TMP CLIENTE" y lo cargado en la fecha de prueba). Uso: npm run cy:limpiar
import { config } from "dotenv";
import path from "node:path";
config({ path: path.resolve(__dirname, "../.env.local") });
import { barrerRestos } from "../cypress/support/db";

barrerRestos()
  .then((r) => console.log(r.usuarios || r.clientes ? `Limpiado: ${r.usuarios} usuarios, ${r.clientes} clientes de prueba` : "No había restos de pruebas"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
