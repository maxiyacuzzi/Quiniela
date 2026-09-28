import Link from "next/link";
import { requerirPerfil } from "@/lib/perfil";
import { getFechaHoyArgentina } from "@/lib/fechas";
import { getResultadosPorFecha } from "@/lib/queries";
import EditarSorteosClient from "./EditarSorteosClient";

export const dynamic = "force-dynamic";

export default async function EditarSorteos() {
  await requerirPerfil();
  const hoy = getFechaHoyArgentina();
  const filas = await getResultadosPorFecha(hoy);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar sorteos</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Corregí a mano un número si la fuente lo publicó mal.
          </p>
        </div>
        <Link
          href="/gestion"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a Gestión
        </Link>
      </header>

      <EditarSorteosClient fechaInicial={hoy} filasIniciales={filas} />
    </main>
  );
}
