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
        <h1 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold tracking-tight">
          Último sorteo
        </h1>
        <p className="text-[clamp(0.9rem,1.3vw,1.25rem)] text-neutral-600 dark:text-neutral-400">
          {turno ? `${TURNO_LABEL[turno]} — ` : ""}
          {fecha}
          {!esFechaPedida && " (último día con sorteos)"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <BotonActualizar />
        <Link
          href="/"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a AgenciaKava&apos;s
        </Link>
      </div>
    </header>
  );

  if (!disponible || !turno) {
    return (
      <main className="flex h-screen w-screen flex-col overflow-hidden px-[3vw] py-[2vh] text-neutral-900 dark:text-neutral-100">
        {encabezado}
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-[clamp(1.5rem,3vw,2.5rem)] text-neutral-600 dark:text-neutral-400">
            Los sorteos de hoy todavía no arrancaron (la Previa suele salir ~10hs). Probá de nuevo
            más tarde.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden px-[3vw] py-[2vh] text-neutral-900 dark:text-neutral-100">
      {encabezado}

      <div className="grid flex-1 grid-cols-5 gap-[1.2vw]">
        {filas.map((fila) => {
          const numeros = fila.porTurno[turno];
          const cabeza = numeros[0];
          const restantes = numeros.slice(1); // posiciones 2 a 10 (la 1 ya se muestra como cabeza)
          return (
            <div
              key={fila.slug}
              className="flex flex-col items-center rounded-2xl border border-neutral-300 bg-neutral-50 p-[1vw] dark:border-neutral-800 dark:bg-neutral-900/60"
            >
              <div className="text-[clamp(1rem,1.6vw,1.5rem)] font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                {fila.nombre}
              </div>
              <div className="my-[1vh]">
                {cabeza ? (
                  <span className="font-mono text-[clamp(2.5rem,6.5vw,6rem)] font-black leading-none text-red-600 dark:text-red-500">
                    {cabeza}
                  </span>
                ) : (
                  <span className="font-mono text-[clamp(2.5rem,6.5vw,6rem)] font-black leading-none text-neutral-400 dark:text-neutral-700">
                    —
                  </span>
                )}
              </div>
              <ol className="grid w-full grid-cols-1 gap-y-[0.3vh] text-[clamp(1rem,3vh,2rem)] text-neutral-600 dark:text-neutral-400">
                {restantes.map((numero, i) => (
                  <li key={i} className="flex justify-between gap-2 font-mono">
                    <span className="text-neutral-400 dark:text-neutral-600">{i + 2}.</span>
                    <span>{numero ?? "—"}</span>
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
