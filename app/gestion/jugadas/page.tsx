import Link from "next/link";
import { requerirPerfil } from "@/lib/perfil";
import { listarClientes } from "@/lib/clientes";
import { listarActividadReciente } from "@/lib/actividad-clientes";
import { getFechaHoyArgentina } from "@/lib/fechas";
import JugadasClient from "./JugadasClient";

export const dynamic = "force-dynamic";

export default async function Jugadas() {
  await requerirPerfil();
  const [clientes, actividad] = await Promise.all([
    listarClientes(),
    listarActividadReciente(),
  ]);
  const hoy = getFechaHoyArgentina();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jugadas</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Cargar jugadas y premios de clientes
          </p>
        </div>
        <Link
          href="/gestion"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a Gestión
        </Link>
      </header>

      <JugadasClient clientes={clientes} actividadInicial={actividad} hoy={hoy} />
    </main>
  );
}
