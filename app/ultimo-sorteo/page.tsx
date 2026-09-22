import {
  getResultadosPorFecha,
  getResultadosRecientes,
  tieneAlgunNumero,
  ultimoTurnoConDatos,
} from "@/lib/queries";
import { asegurarFecha } from "@/lib/historial";
import { getFechaHoyArgentina } from "@/lib/fechas";
import { TURNO_LABEL } from "@/lib/turnos";
import Link from "next/link";
import BotonActualizar from "../BotonActualizar";

export const dynamic = "force-dynamic";

// Color fijo por jurisdicción (pantalla pensada para un TV, siempre oscura).
const COLOR_JURISDICCION: Record<string, string> = {
  ciudad: "text-blue-400",
  provincia: "text-red-400",
  cordoba: "text-green-400",
  "santa-fe": "text-yellow-400",
  "entre-rios": "text-purple-400",
};

export default async function UltimoSorteo() {
  const hoy = getFechaHoyArgentina();

  // Dispara el scrape de hoy si todavía no está guardado.
  await asegurarFecha(hoy);

  // Si hoy no tiene ningún turno todavía (domingo, o antes de la Previa),
  // retrocede al último día con sorteos (mismo mecanismo que /pantalla).
  const resultadosRecientes = await getResultadosRecientes(hoy);
  const { fecha, esFechaPedida } = resultadosRecientes;
  let filas = resultadosRecientes.filas;

  if (!esFechaPedida) {
    await asegurarFecha(fecha);
    filas = await getResultadosPorFecha(fecha);
  }

  const disponible = tieneAlgunNumero(filas);
  const turno = disponible ? ultimoTurnoConDatos(filas) : null;

  const encabezado = (
    <header className="mb-[1vh] flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight text-white">
          {turno ? TURNO_LABEL[turno] : "Sin sorteos"}
        </h1>
        <p className="text-[clamp(1.1rem,1.8vw,1.75rem)] text-neutral-400">
          {fecha}
          {!esFechaPedida && " (último día con sorteos)"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <BotonActualizar />
        <Link
          href="/"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          ← Volver a AgenciaKava&apos;s
        </Link>
      </div>
    </header>
  );

  if (!disponible || !turno) {
    return (
      <main className="flex h-screen w-screen flex-col overflow-hidden bg-black px-[3vw] py-[2vh]">
        {encabezado}
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-[clamp(1.5rem,3vw,2.5rem)] text-neutral-400">
            Los sorteos de hoy todavía no arrancaron (la Previa suele salir ~10hs). Probá de nuevo
            más tarde.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-black px-[3vw] py-[2vh]">
      {encabezado}

      <div className="grid flex-1 grid-cols-5 gap-[1.2vw]">
        {filas.map((fila) => {
          const numeros = fila.porTurno[turno];
          const cabeza = numeros[0];
          const restantes = numeros.slice(1); // posiciones 2 a 10 (la 1 ya se muestra como cabeza)
          return (
            <div
              key={fila.slug}
              className="flex flex-col items-center rounded-2xl border border-neutral-800 bg-neutral-950 p-[1vw]"
            >
              <div
                className={`text-[clamp(1.2rem,2vw,1.9rem)] font-semibold uppercase tracking-wide ${
                  COLOR_JURISDICCION[fila.slug] ?? "text-neutral-400"
                }`}
              >
                {fila.nombre}
              </div>
              <div className="my-[1vh]">
                {cabeza ? (
                  <span className="font-mono text-[clamp(2.5rem,6.5vw,6rem)] font-black leading-none text-red-500">
                    {cabeza}
                  </span>
                ) : (
                  <span className="font-mono text-[clamp(2.5rem,6.5vw,6rem)] font-black leading-none text-neutral-700">
                    —
                  </span>
                )}
              </div>
              <ol className="grid w-full flex-1 grid-cols-1 content-around text-[clamp(1.3rem,5vh,3.2rem)]">
                {restantes.map((numero, i) => (
                  <li key={i} className="flex justify-between gap-2 font-mono">
                    <span className="text-yellow-400">{i + 2}.</span>
                    <span className="text-white">{numero ?? "—"}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </main>
  );
}
