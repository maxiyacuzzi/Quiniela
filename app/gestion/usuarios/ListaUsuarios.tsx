"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROL_LABEL } from "@/lib/roles";
import { cambiarActivoAction } from "./actions";
import { UsuarioFila } from "./page";

export default function ListaUsuarios({
  usuarios,
  idPropio,
}: {
  usuarios: UsuarioFila[];
  idPropio: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(u: UsuarioFila) {
    startTransition(async () => {
      await cambiarActivoAction(u.id, !u.activo);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
      <h2 className="p-4 pb-0 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Usuarios existentes
      </h2>
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {usuarios.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {u.nombre}
                {u.id === idPropio && " (vos)"}
              </p>
              <p className="text-xs text-neutral-500">
                {ROL_LABEL[u.rol]} — {u.activo ? "activo" : "desactivado"}
              </p>
            </div>
            {u.id !== idPropio && (
              <button
                type="button"
                onClick={() => toggle(u)}
                disabled={isPending}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                {u.activo ? "Desactivar" : "Activar"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
