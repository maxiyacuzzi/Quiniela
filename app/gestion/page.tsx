import { requerirPerfil } from "@/lib/perfil";
import CambiarPasswordForm from "./CambiarPasswordForm";

export const dynamic = "force-dynamic";

export default async function Gestion() {
  await requerirPerfil();

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Gestión</h1>

      <CambiarPasswordForm />
    </main>
  );
}
