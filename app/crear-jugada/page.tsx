import Link from "next/link";
import { getFechaHoyArgentina } from "@/lib/fechas";
import CrearJugadaForm from "./CrearJugadaForm";

export const dynamic = "force-dynamic";

export default function CrearJugada() {
  const hoy = getFechaHoyArgentina();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crear jugada</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Armá una jugada y mandala por WhatsApp con un mensaje prolijo
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a cabezas del día
        </Link>
      </header>

      <CrearJugadaForm hoy={hoy} />
    </main>
  );
}
