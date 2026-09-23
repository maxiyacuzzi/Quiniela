import { getResultadosPorFecha } from "./queries";
import { obtenerSorteosRuta1000, JurisdiccionRuta1000 } from "./ruta1000";
import { TURNOS_ORDEN, TurnoKey } from "./turnos";

const JURISDICCIONES_RUTA1000 = new Set<string>([
  "ciudad",
  "provincia",
  "cordoba",
  "santa-fe",
  "entre-rios",
]);

export interface DiferenciaRuta1000 {
  jurisdiccionSlug: string;
  turno: TurnoKey;
  posicion: number;
  nuestro: string | null;
  ruta1000: string | null;
}

// Compara lo que tenemos guardado para una fecha contra ruta1000.com.ar,
// posición por posición (solo las primeras 10, que es lo que usa la app).
// Pensado para chequear a mano un caso raro puntual, no para uso masivo.
export async function compararConRuta1000(fecha: string): Promise<DiferenciaRuta1000[]> {
  const filas = await getResultadosPorFecha(fecha);
  const diferencias: DiferenciaRuta1000[] = [];

  const cacheRuta1000 = new Map<string, Awaited<ReturnType<typeof obtenerSorteosRuta1000>>>();

  for (const fila of filas) {
    if (!JURISDICCIONES_RUTA1000.has(fila.slug)) continue;
    const jurisdiccion = fila.slug as JurisdiccionRuta1000;

    if (!cacheRuta1000.has(jurisdiccion)) {
      cacheRuta1000.set(jurisdiccion, await obtenerSorteosRuta1000(jurisdiccion));
    }
    const sorteos = cacheRuta1000.get(jurisdiccion)!;

    for (const turno of TURNOS_ORDEN) {
      const sorteo = sorteos.find((s) => s.fecha === fecha && s.turno === turno);
      const nuestros = fila.porTurno[turno];

      for (let i = 0; i < 10; i++) {
        const nuestro = nuestros[i];
        const deRuta1000 = sorteo ? (sorteo.numeros[i] ?? null) : null;
        if (nuestro !== deRuta1000) {
          diferencias.push({
            jurisdiccionSlug: fila.slug,
            turno,
            posicion: i + 1,
            nuestro,
            ruta1000: deRuta1000,
          });
        }
      }
    }
  }

  return diferencias;
}
