import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.local") });

import { compararConRuta1000 } from "../lib/comparar-ruta1000";
import { getFechaHoyArgentina } from "../lib/fechas";

async function main() {
  const fecha = process.argv[2] ?? getFechaHoyArgentina();
  console.log(`Comparando ${fecha} contra ruta1000.com.ar...\n`);

  const diferencias = await compararConRuta1000(fecha);

  if (diferencias.length === 0) {
    console.log("Sin diferencias — coincide todo.");
    return;
  }

  for (const d of diferencias) {
    console.log(
      `${d.jurisdiccionSlug} / ${d.turno} / posición ${d.posicion}: nosotros="${d.nuestro ?? "—"}" ruta1000="${d.ruta1000 ?? "—"}"`
    );
  }
  console.log(`\n${diferencias.length} diferencia(s) encontrada(s).`);
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
