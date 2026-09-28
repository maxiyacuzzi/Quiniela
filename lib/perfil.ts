import { redirect } from "next/navigation";
import { getSupabaseServer } from "./supabase-server";
import { Rol } from "./roles";

export interface Perfil {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
}

export async function getPerfilActual(): Promise<Perfil | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("nombre, rol, activo")
    .eq("id", user.id)
    .single();
  if (!data) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    nombre: data.nombre,
    rol: data.rol as Rol,
    activo: data.activo,
  };
}

// Para usar al principio de cada página de /gestion (menos /gestion/login):
// redirige al login si no hay sesión o el usuario está desactivado, y a
// /gestion si está logueado pero no tiene uno de los roles permitidos.
export async function requerirPerfil(rolesPermitidos?: Rol[]): Promise<Perfil> {
  const perfil = await getPerfilActual();
  if (!perfil || !perfil.activo) redirect("/gestion/login");
  if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) redirect("/gestion");
  return perfil;
}
