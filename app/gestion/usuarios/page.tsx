import Link from "next/link";
import { requerirPerfil } from "@/lib/perfil";
import { getSupabaseAdmin } from "@/lib/supabase";
import CrearUsuarioForm from "./CrearUsuarioForm";
import ListaUsuarios from "./ListaUsuarios";

export const dynamic = "force-dynamic";

export interface UsuarioFila {
  id: string;
  nombre: string;
  rol: "dueno" | "empleado";
  activo: boolean;
}

export default async function Usuarios() {
  const perfil = await requerirPerfil(["dueno"]);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, activo")
    .order("creado_en");

  if (error) throw new Error(`Error al leer usuarios: ${error.message}`);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <Link
          href="/gestion"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a Gestión
        </Link>
      </header>

      <div className="flex flex-col gap-6">
        <CrearUsuarioForm />
        <ListaUsuarios usuarios={data as UsuarioFila[]} idPropio={perfil.id} />
      </div>
    </main>
  );
}
