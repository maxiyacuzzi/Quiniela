// Ejecuta la CLI de Cypress sin ELECTRON_RUN_AS_NODE: los editores basados en
// Electron (VS Code) lo definen en su terminal y hace que Cypress no arranque.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(raiz, "node_modules", ".bin", process.platform === "win32" ? "cypress.cmd" : "cypress");
const r = spawnSync(bin, process.argv.slice(2), { stdio: "inherit", env, shell: process.platform === "win32" });
process.exit(r.status ?? 1);
