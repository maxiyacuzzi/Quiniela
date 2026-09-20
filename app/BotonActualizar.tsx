"use client";

import { useState, useTransition } from "react";
import { actualizarAhora } from "./actions";

export default function BotonActualizar() {
  const [isPending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  function onClick() {
    setMensaje(null);
    startTransition(async () => {
      try {
        const resumen = await actualizarAhora();
        setMensaje(`Actualizado: ${resumen.filas} resultados (${resumen.fecha}).`);
      } catch (err) {
        setMensaje(err instanceof Error ? err.message : "Error al actualizar");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={isPending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
      >
        {isPending ? "Actualizando..." : "Actualizar ahora"}
      </button>
      {mensaje && <p className="text-xs text-neutral-600 dark:text-neutral-400">{mensaje}</p>}
    </div>
  );
}
