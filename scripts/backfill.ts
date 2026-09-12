import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.local") });

import { asegurarFecha } from "../lib/historial";
import { getFechaHoyArgentina } from "../lib/fechas";

const DIAS = Number(process.argv[2] ?? 30);

function restarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - dias);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const hoy = getFechaHoyArgentina();
  let guardadas = 0;
  let sinSorteo = 0;

  for (let i = 0; i <= DIAS; i++) {
    const fecha = restarDias(hoy, i);
    try {
      const { disponible } = await asegurarFecha(fecha);
      if (disponible) {
        guardadas++;
        console.log(`OK   ${fecha}`);
      } else {
        sinSorteo++;
        console.log(`--   ${fecha} (sin sorteo / no disponible)`);
      }
    } catch (err) {
      console.error(`ERROR ${fecha}:`, err instanceof Error ? err.message : err);
    }
    // pequeña pausa para no bombardear la fuente
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\nListo: ${guardadas} días guardados, ${sinSorteo} sin sorteo, de los últimos ${DIAS} días.`);
}

main().catch((err) => {
  console.error("Falló el backfill:", err instanceof Error ? err.message : err);
  process.exit(1);
});
