"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClienteDetalle } from "@/lib/clientes";
import { editarClienteAction, cambiarActivoClienteAction } from "../actions";

export default function EditarClienteForm({ cliente }: { cliente: ClienteDetalle }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(cliente.nombre);
  const [sobrenombre, setSobrenombre] = useState(cliente.sobrenombre ?? "");
  const [telefono, setTelefono] = useState(cliente.telefono ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await editarClienteAction({ id: cliente.id, nombre, sobrenombre, telefono });
        setOk(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  function toggleActivo() {
    startTransition(async () => {
      await cambiarActivoClienteAction(cliente.id, !cliente.activo);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 items-end gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60 sm:grid-cols-3"
    >
      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Nombre
        <input
          type="text"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Sobrenombre
        <input
          type="text"
          value={sobrenombre}
          onChange={(e) => setSobrenombre(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Teléfono
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-3">{error}</p>}
      {ok && <p className="text-sm text-green-600 dark:text-green-400 sm:col-span-3">Guardado.</p>}

      <div className="flex gap-2 sm:col-span-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar datos"}
        </button>
        <button
          type="button"
          onClick={toggleActivo}
          disabled={isPending}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {cliente.activo ? "Marcar inactivo" : "Marcar activo"}
        </button>
      </div>
    </form>
  );
}
