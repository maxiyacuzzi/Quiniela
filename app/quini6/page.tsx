import Link from "next/link";
import { getFechaHoyArgentina } from "@/lib/fechas";
import Quini6Tabs from "./Quini6Tabs";
import { obtenerSorteoQuini6Action } from "./ver-sorteos-actions";

export const dynamic = "force-dynamic";

export default async function Quini6() {
  const hoy = getFechaHoyArgentina();
  const sorteoInicial = await obtenerSorteoQuini6Action();

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quini 6</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Sorteos, jugadas y control de premio de Quini 6
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a AgenciaKava&apos;s
        </Link>
      </header>

      <Quini6Tabs hoy={hoy} sorteoInicial={sorteoInicial} />
    </main>
  );
}
