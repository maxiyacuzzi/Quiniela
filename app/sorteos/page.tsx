import { getResultadosPorFecha, getResultadosRecientes, tieneAlgunNumero } from "@/lib/queries";
import { asegurarFecha } from "@/lib/historial";
import { getFechaHoyArgentina, esFechaValida } from "@/lib/fechas";
import { TURNOS_ORDEN, TURNO_LABEL } from "@/lib/turnos";
import Link from "next/link";
import BotonActualizar from "../BotonActualizar";
import SelectorFecha from "../SelectorFecha";

export const dynamic = "force-dynamic";

export default async function Sorteos({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const hoy = getFechaHoyArgentina();
  const fechaPedida = fechaParam && esFechaValida(fechaParam) ? fechaParam : hoy;

  // Dispara el scrape si la fecha pedida todavía no está guardada.
  await asegurarFecha(fechaPedida);

  // Los domingos (y cualquier día sin sorteo) no hay datos propios: retrocede
  // día a día hasta el último que sí tenga (mismo mecanismo que /pantalla).
  const resultadosRecientes = await getResultadosRecientes(fechaPedida);
  const { fecha, esFechaPedida } = resultadosRecientes;
  let filas = resultadosRecientes.filas;

  // Si cayó a un día de respaldo, aseguramos que ESE día también esté completo
  // (puede haberse guardado a medias antes de que salieran todos los turnos).
  if (!esFechaPedida) {
    await asegurarFecha(fecha);
    filas = await getResultadosPorFecha(fecha);
  }

  const disponible = tieneAlgunNumero(filas);

  const encabezado = (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sorteos</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Cabeza y primeros 10 números por jurisdicción y turno
        </p>
      </div>
      <div className="flex items-center gap-3">
        <SelectorFecha fecha={fechaPedida} max={hoy} />
        <BotonActualizar />
        <Link
          href="/"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a cabezas del día
        </Link>
      </div>
    </header>
  );

  if (!disponible) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
        {encabezado}
        <p className="mt-12 text-center text-neutral-600 dark:text-neutral-400">
          No hay resultados guardados cerca del {fechaPedida}. Probá con otra fecha en el
          calendario.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      {encabezado}

      <div className="flex flex-col gap-8">
        {filas.map((fila) => (
          <section key={fila.slug}>
            <h2 className="mb-3 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              {fila.nombre}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {TURNOS_ORDEN.map((turno) => {
                const numeros = fila.porTurno[turno];
                const cabeza = numeros[0];
                return (
                  <div
                    key={turno}
                    className="rounded-xl border border-neutral-300 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/60"
                  >
                    <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                      {TURNO_LABEL[turno]}
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
        ))}
      </div>

      <footer className="mt-8 text-center text-xs text-neutral-500">
        Fecha mostrada: {fecha}
        {!esFechaPedida && " (último día con sorteos)"}
      </footer>
    </main>
  );
}
