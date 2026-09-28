"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requerirPerfil } from "@/lib/perfil";
import { Rol } from "@/lib/roles";

export interface CrearUsuarioInput {
  email: string;
  password: string;
  nombre: string;
  rol: Rol;
}

export async function crearUsuarioAction(input: CrearUsuarioInput): Promise<{ id: string }> {
  await requerirPerfil(["dueno"]);

  const { email, password, nombre, rol } = input;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email inválido");
  if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
  if (!nombre.trim()) throw new Error("Falta el nombre");
  if (rol !== "dueno" && rol !== "empleado") throw new Error("Rol inválido");

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Error al crear el usuario: ${error.message}`);

  const { error: errorPerfil } = await supabase
    .from("perfiles")
    .insert({ id: data.user.id, nombre, rol });

  if (errorPerfil) {
    // Si falló guardar el perfil, no dejamos un usuario de Auth huérfano.
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error(`Error al guardar el perfil: ${errorPerfil.message}`);
  }

  return { id: data.user.id };
}

export async function cambiarActivoAction(id: string, activo: boolean): Promise<void> {
  const perfil = await requerirPerfil(["dueno"]);
  if (id === perfil.id) throw new Error("No podés desactivar tu propia cuenta");

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("perfiles").update({ activo }).eq("id", id);
  if (error) throw new Error(`Error al actualizar el usuario: ${error.message}`);

  // Además de la bandera "activo" (que ya bloquea el acceso a /gestion),
  // baneamos/desbaneamos el usuario en Supabase Auth como segunda barrera.
  await supabase.auth.admin.updateUserById(id, {
    ban_duration: activo ? "none" : "876000h", // ~100 años
  });
}
