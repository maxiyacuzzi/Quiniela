import { getResultadosPorFecha } from "@/lib/queries";
import { asegurarFecha } from "@/lib/historial";
import { getFechaHoyArgentina, esFechaValida } from "@/lib/fechas";
import { TURNOS_ORDEN, TURNO_LABEL } from "@/lib/turnos";
import Link from "next/link";
import Image from "next/image";
import BotonActualizar from "./BotonActualizar";
import SelectorFecha from "./SelectorFecha";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const hoy = getFechaHoyArgentina();
  const fecha = fechaParam && esFechaValida(fechaParam) ? fechaParam : hoy;

  const { disponible } = await asegurarFecha(fecha);

  const encabezado = (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-white p-1.5">
          <Image
            src="/kavas-logo-horizontal.jpeg"
            alt="Kava's Agencia de Quiniela"
            width={815}
            height={640}
            className="h-12 w-auto sm:h-14"
            priority
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cabezas del día</h1>
          <p className="text-sm text-neutral-400">
            Cabeza y primeros 10 números por jurisdicción y turno
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/pantalla"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Pantalla
        </Link>
        <Link
          href="/estadisticas"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Estadísticas
        </Link>
        <SelectorFecha fecha={fecha} max={hoy} />
        <BotonActualizar />
      </div>
    </header>
  );

  if (!disponible) {
    const mensaje =
      fecha === hoy
        ? "Los sorteos de hoy todavía no arrancaron (la Previa suele salir ~10hs). Probá de nuevo más tarde, o mirá otra fecha."
        : `No hay resultados para el ${fecha} (puede ser un día sin sorteo, como un domingo, o una fecha fuera de rango). Probá con otra fecha en el calendario.`;

    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-neutral-100">
        {encabezado}
        <p className="mt-12 text-center text-neutral-400">{mensaje}</p>
      </main>
    );
  }

  const filas = await getResultadosPorFecha(fecha);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-neutral-100">
      {encabezado}

      <div className="flex flex-col gap-8">
        {filas.map((fila) => (
          <section key={fila.slug}>
            <h2 className="mb-3 text-lg font-semibold text-neutral-200">{fila.nombre}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {TURNOS_ORDEN.map((turno) => {
                const numeros = fila.porTurno[turno];
                const cabeza = numeros[0];
                return (
                  <div
                    key={turno}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3"
                  >
                    <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      {TURNO_LABEL[turno]}
                    </div>
                    <div className="mb-3 text-center">
                      {cabeza ? (
                        <span className="inline-block rounded-lg bg-red-600/15 px-3 py-1 font-mono text-2xl font-bold text-red-500">
                          {cabeza}
                        </span>
                      ) : (
                        <span className="font-mono text-2xl text-neutral-600">—</span>
                      )}
                    </div>
                    <ol className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-neutral-400">
                      {numeros.map((numero, i) => (
                        <li key={i} className="flex justify-between gap-1 font-mono">
                          <span className="text-neutral-600">{i + 1}.</span>
                          <span className={i === 0 ? "text-red-500" : ""}>
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
        Fuente: vivitusuerte.com — datos guardados en Supabase, fecha mostrada: {fecha}
      </footer>
    </main>
  );
}
