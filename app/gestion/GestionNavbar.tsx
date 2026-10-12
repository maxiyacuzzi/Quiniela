"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Perfil } from "@/lib/perfil";
import { ROL_LABEL } from "@/lib/roles";
import LogoutButton from "./LogoutButton";

const SECCIONES = [
  { href: "/gestion/clientes", label: "Clientes" },
  { href: "/gestion/jugadas", label: "Jugadas" },
  { href: "/gestion/caja", label: "Caja" },
  { href: "/gestion/sorteos", label: "Sorteos" },
];

function esActivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function GestionNavbar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname();

  const linkClase = (activo: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      activo
        ? "bg-red-600 text-white"
        : "text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
    }`;

  return (
    <nav className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-50/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href="/gestion"
            className="mr-2 text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            Gestión
          </Link>
          {SECCIONES.map((s) => (
            <Link key={s.href} href={s.href} className={linkClase(esActivo(pathname, s.href))}>
              {s.label}
            </Link>
          ))}
          {perfil.rol === "dueno" && (
            <>
              <Link
                href="/gestion/estadisticas"
                className={linkClase(esActivo(pathname, "/gestion/estadisticas"))}
              >
                Estadísticas
              </Link>
              <Link
                href="/gestion/usuarios"
                className={linkClase(esActivo(pathname, "/gestion/usuarios"))}
              >
                Usuarios
              </Link>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {perfil.nombre} — {ROL_LABEL[perfil.rol]}
          </span>
          <Link
            href="/"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            ← Sitio público
          </Link>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
