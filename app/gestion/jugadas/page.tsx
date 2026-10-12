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
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Jugadas</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Cargar jugadas y premios de clientes
        </p>
      </header>

      <JugadasClient clientes={clientes} actividadInicial={actividad} hoy={hoy} />
    </main>
  );
}
