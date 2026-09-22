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
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Último sorteo</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          El último sorteo, en todas las jurisdicciones
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
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
        {encabezado}
        <p className="mt-12 text-center text-neutral-600 dark:text-neutral-400">
          Los sorteos de hoy todavía no arrancaron (la Previa suele salir ~10hs). Probá de nuevo
          más tarde.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      {encabezado}

      <section>
        <h2 className="text-center text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-200">
          Último sorteo
        </h2>
        <p className="mb-4 text-center text-lg text-neutral-600 dark:text-neutral-400">
          {TURNO_LABEL[turno]}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {filas.map((fila) => {
            const numeros = fila.porTurno[turno];
            const cabeza = numeros[0];
            const restantes = numeros.slice(1); // posiciones 2 a 10 (la 1 ya se muestra como cabeza)
            return (
              <div
                key={fila.slug}
                className="rounded-xl border border-neutral-300 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                  {fila.nombre}
                </div>
                <div className="mb-3 text-center">
                  {cabeza ? (
                    <span className="inline-block rounded-lg bg-red-50 px-3 py-1 font-mono text-4xl font-bold text-red-600 dark:bg-red-600/15 dark:text-red-500">
                      {cabeza}
                    </span>
                  ) : (
                    <span className="font-mono text-4xl text-neutral-400 dark:text-neutral-600">
                      —
                    </span>
                  )}
                </div>
                <ol className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-base text-neutral-600 dark:text-neutral-400">
                  {restantes.map((numero, i) => (
                    <li key={i} className="flex justify-between gap-1 font-mono">
                      <span className="text-neutral-400 dark:text-neutral-600">{i + 2}.</span>
                      <span>{numero ?? "—"}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="mt-8 text-center text-xs text-neutral-500">
        Fecha mostrada: {fecha}
        {!esFechaPedida && " (último día con sorteos)"}
      </footer>
    </main>
  );
}
