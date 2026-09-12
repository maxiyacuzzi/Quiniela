import { getFechasDisponibles, getResultadosPorFecha, getUltimaFecha } from "@/lib/queries";
import { TURNOS_ORDEN, TURNO_LABEL } from "@/lib/turnos";
import BotonActualizar from "./BotonActualizar";
import SelectorFecha from "./SelectorFecha";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const ultimaFecha = await getUltimaFecha();

  if (!ultimaFecha) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center text-neutral-200">
        <h1 className="text-2xl font-bold">Todavía no hay resultados guardados</h1>
        <p className="text-neutral-400">
          Corré el scraper por primera vez (botón de abajo o <code>node scripts/scrape-once.ts</code>).
        </p>
        <BotonActualizar />
      </main>
    );
  }

  const fecha = fechaParam ?? ultimaFecha;
  const [fechas, filas] = await Promise.all([
    getFechasDisponibles(),
    getResultadosPorFecha(fecha),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 text-neutral-100">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cabezas del día</h1>
          <p className="text-sm text-neutral-400">Resultados de quiniela por jurisdicción y turno</p>
        </div>
        <div className="flex items-center gap-3">
          <SelectorFecha fechas={fechas} fechaActual={fecha} />
          <BotonActualizar />
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-900 text-left text-neutral-300">
              <th className="sticky left-0 z-10 bg-neutral-900 px-4 py-3 font-semibold">
                Jurisdicción
              </th>
              {TURNOS_ORDEN.map((t) => (
                <th key={t} className="px-4 py-3 text-center font-semibold">
                  {TURNO_LABEL[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr
                key={fila.slug}
                className={i % 2 === 0 ? "bg-neutral-950" : "bg-neutral-900/40"}
              >
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-medium text-neutral-100">
                  {fila.nombre}
                </td>
                {TURNOS_ORDEN.map((t) => {
                  const numero = fila.porTurno[t];
                  return (
                    <td key={t} className="px-4 py-2 text-center font-mono">
                      {numero ? (
                        <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-400">
                          {numero}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-6 text-center text-xs text-neutral-500">
        Fuente: vivitusuerte.com — datos guardados en Supabase, fecha mostrada: {fecha}
      </footer>
    </main>
  );
}
