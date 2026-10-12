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
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Clientes</h1>

      <div className="flex flex-col gap-6">
        <NuevoClienteForm />
        <ListaClientes clientes={clientes} />
      </div>
    </main>
  );
}
