import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirPerfil } from "@/lib/perfil";
import { getClienteDetalle } from "@/lib/clientes";
import { listarActividadPorCliente } from "@/lib/actividad-clientes";
import EditarClienteForm from "./EditarClienteForm";
import NuevoMovimientoForm from "./NuevoMovimientoForm";
import ListaMovimientos from "./ListaMovimientos";
import ActividadLista from "../../jugadas/ActividadLista";

export const dynamic = "force-dynamic";

export default async function ClienteDetalle({ params }: { params: Promise<{ id: string }> }) {
  await requerirPerfil();
  const { id } = await params;

  const cliente = await getClienteDetalle(id);
  if (!cliente) notFound();

  const actividad = await listarActividadPorCliente(id);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{cliente.nombre}</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/gestion/jugadas"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500"
          >
            Cargar jugada/premio
          </Link>
          <Link
            href="/gestion/clientes"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            ← Volver a Clientes
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <EditarClienteForm cliente={cliente} />
        <NuevoMovimientoForm clienteId={cliente.id} />
        <ActividadLista titulo="Jugadas y premios" actividad={actividad} mostrarCliente={false} />
        <ListaMovimientos saldo={cliente.saldo} movimientos={cliente.movimientos} />
      </div>
    </main>
  );
}
