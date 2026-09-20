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
import Image from "next/image";
import BotonActualizar from "./BotonActualizar";

export const dynamic = "force-dynamic";

export default async function Home() {
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
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-white p-1.5">
          <Image
            src="/kavas-logo-redondo.jpeg"
            alt="AgenciaKava's"
            width={1280}
            height={853}
            className="h-12 w-auto sm:h-14"
            priority
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AgenciaKava&apos;s</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            El último sorteo, en todas las jurisdicciones
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/sorteos"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Sorteos
        </Link>
        <Link
          href="/pantalla"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Pantalla
        </Link>
        <Link
          href="/estadisticas"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Estadísticas
        </Link>
        <Link
          href="/controlar-premio"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Controlar premio
        </Link>
        <Link
          href="/crear-jugada"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Crear jugada
        </Link>
        <Link
          href="/quini6"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Quini 6
        </Link>
        <BotonActualizar />
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
        <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-200">
          {TURNO_LABEL[turno]}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {filas.map((fila) => {
            const numeros = fila.porTurno[turno];
            const cabeza = numeros[0];
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
                    <span className="inline-block rounded-lg bg-red-50 px-3 py-1 font-mono text-2xl font-bold text-red-600 dark:bg-red-600/15 dark:text-red-500">
                      {cabeza}
                    </span>
                  ) : (
                    <span className="font-mono text-2xl text-neutral-400 dark:text-neutral-600">
                      —
                    </span>
                  )}
                </div>
                <ol className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {numeros.map((numero, i) => (
                    <li key={i} className="flex justify-between gap-1 font-mono">
                      <span className="text-neutral-400 dark:text-neutral-600">{i + 1}.</span>
                      <span className={i === 0 ? "text-red-600 dark:text-red-500" : ""}>
                        {numero ?? "—"}
                      </span>
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
