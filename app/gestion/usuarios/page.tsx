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
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Usuarios</h1>

      <div className="flex flex-col gap-6">
        <CrearUsuarioForm />
        <ListaUsuarios usuarios={data as UsuarioFila[]} idPropio={perfil.id} />
      </div>
    </main>
  );
}
