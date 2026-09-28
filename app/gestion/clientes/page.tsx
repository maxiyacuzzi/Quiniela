import Link from "next/link";
import { requerirPerfil } from "@/lib/perfil";
import { listarClientes } from "@/lib/clientes";
import NuevoClienteForm from "./NuevoClienteForm";
import ListaClientes from "./ListaClientes";

export const dynamic = "force-dynamic";

export default async function Clientes() {
  await requerirPerfil();
  const clientes = await listarClientes();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <Link
          href="/gestion"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a Gestión
        </Link>
      </header>

      <div className="flex flex-col gap-6">
        <NuevoClienteForm />
        <ListaClientes clientes={clientes} />
      </div>
    </main>
  );
}
