import { getPerfilActual } from "@/lib/perfil";
import type { Metadata } from "next";
import GestionNavbar from "./GestionNavbar";

export const metadata: Metadata = {
  title: { default: "Gestión", template: "%s · Gestión" },
  robots: { index: false, follow: false },
};

// Envuelve todo /gestion/* (login incluido, por eso el chequeo de perfil acá
// en vez de requerirPerfil: en /gestion/login no hay sesión, y no tiene que
// redirigir ni mostrar el navbar). El resto de las páginas siguen llamando a
// requerirPerfil() ellas mismas para la data y el control de roles.
export default async function GestionLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfilActual();
  if (!perfil || !perfil.activo) return <>{children}</>;

  return (
    <>
      <GestionNavbar perfil={perfil} />
      {children}
    </>
  );
}
