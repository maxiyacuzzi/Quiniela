import Link from "next/link";
import { getFechaHoyArgentina } from "@/lib/fechas";
import ControlarPremioForm from "./ControlarPremioForm";
import SubirTicket from "./SubirTicket";

export const dynamic = "force-dynamic";

export default function ControlarPremio() {
  const hoy = getFechaHoyArgentina();

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controlar premio</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Fijate si un número jugado salió ganador
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a cabezas del día
        </Link>
      </header>

      <div className="flex flex-col gap-6">
        <ControlarPremioForm hoy={hoy} />
        <SubirTicket />
      </div>
    </main>
  );
}
