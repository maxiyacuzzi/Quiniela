import Link from "next/link";
import { getEstadisticas, getRangoFechas } from "@/lib/estadisticas";

export const dynamic = "force-dynamic";

export default async function Estadisticas() {
  const [estadisticas, rango] = await Promise.all([getEstadisticas(), getRangoFechas()]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-sm text-neutral-400">
            Top 5 más salidos y más atrasados, por cantidad de cifras
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          ← Volver a cabezas del día
        </Link>
      </header>

      {!rango ? (
        <p className="text-center text-neutral-400">Todavía no hay resultados guardados.</p>
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {estadisticas.map(({ cifras, masFrecuentes, masAtrasados }) => (
              <section key={cifras}>
                <h2 className="mb-3 text-lg font-semibold text-neutral-200">{cifras} cifras</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
                      Más salidos
                    </h3>
                    <ol className="flex flex-col gap-2">
                      {masFrecuentes.map((f, i) => (
                        <li
                          key={f.numero}
                          className="flex items-center justify-between rounded-lg bg-neutral-950 px-3 py-2"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-neutral-600">{i + 1}.</span>
                            <span className="font-mono text-lg font-bold text-emerald-400">
                              {f.numero}
                            </span>
                          </span>
                          <span className="text-xs text-neutral-400">
                            {f.apariciones} {f.apariciones === 1 ? "vez" : "veces"}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">
                      Más atrasados
                    </h3>
                    <ol className="flex flex-col gap-2">
                      {masAtrasados.map((a, i) => (
                        <li
                          key={a.numero}
                          className="flex items-center justify-between rounded-lg bg-neutral-950 px-3 py-2"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-neutral-600">{i + 1}.</span>
                            <span className="font-mono text-lg font-bold text-red-400">
                              {a.numero}
                            </span>
                          </span>
                          <span className="text-xs text-neutral-400">
                            {a.diasAtraso} {a.diasAtraso === 1 ? "día" : "días"} (últ. {a.ultimaFecha})
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-8 text-center text-xs text-neutral-500">
            Calculado sobre {rango.desde} → {rango.hasta} (cabeza + primeros 10 de cada turno, en
            las 5 jurisdicciones guardadas). Las 2 y 3 cifras salen de los últimos dígitos del
            número de 4 cifras.
          </footer>
        </>
      )}
    </main>
  );
}
