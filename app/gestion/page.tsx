import Link from "next/link";
import { requerirPerfil } from "@/lib/perfil";
import { ROL_LABEL } from "@/lib/roles";
import LogoutButton from "./LogoutButton";
import CambiarPasswordForm from "./CambiarPasswordForm";

export const dynamic = "force-dynamic";

// Se van a ir agregando a medida que se construyan (orden: Clientes → Jugadas
// → Caja/cuenta corriente). Por ahora solo Clientes tiene página real.
const SECCIONES = [
  { href: "/gestion/clientes", label: "Clientes", disponible: true },
  { href: "/gestion/jugadas", label: "Jugadas", disponible: true },
  { href: "/gestion/caja", label: "Caja", disponible: true },
  { href: "/gestion/sorteos", label: "Editar sorteos", disponible: true },
];

export default async function Gestion() {
  const perfil = await requerirPerfil();

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {perfil.nombre} — {ROL_LABEL[perfil.rol]}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            ← Volver a AgenciaKava&apos;s
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SECCIONES.map((s) =>
          s.disponible ? (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-neutral-300 bg-neutral-50 px-6 py-4 text-center text-lg font-semibold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              {s.label}
            </Link>
          ) : (
            <div
              key={s.href}
              className="rounded-xl border border-neutral-200 bg-neutral-100 px-6 py-4 text-center text-lg font-semibold text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-600"
            >
              {s.label}
              <p className="mt-1 text-xs font-normal">Próximamente</p>
            </div>
          )
        )}

        {perfil.rol === "dueno" && (
          <Link
            href="/gestion/usuarios"
            className="rounded-xl border border-neutral-300 bg-neutral-50 px-6 py-4 text-center text-lg font-semibold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Usuarios
          </Link>
        )}
      </div>

      <div className="mt-8">
        <CambiarPasswordForm />
      </div>
    </main>
  );
}
