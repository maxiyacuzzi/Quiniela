"use client";

import { useMemo, useState } from "react";
import { ClienteConSaldo } from "@/lib/clientes";

export default function ClientePicker({
  clientes,
  clienteSeleccionado,
  onSeleccionar,
}: {
  clientes: ClienteConSaldo[];
  clienteSeleccionado: ClienteConSaldo | null;
  onSeleccionar: (id: string | null) => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return clientes
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.sobrenombre?.toLowerCase().includes(q) ||
          c.telefono?.includes(q)
      )
      .slice(0, 8);
  }, [clientes, busqueda]);

  if (clienteSeleccionado) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Cliente: {clienteSeleccionado.nombre}
          {clienteSeleccionado.sobrenombre && ` (${clienteSeleccionado.sobrenombre})`}
        </p>
        <button
          type="button"
          onClick={() => {
            onSeleccionar(null);
            setBusqueda("");
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Cambiar cliente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <label className="text-sm text-neutral-700 dark:text-neutral-300">
        Buscar cliente
        <input
          type="text"
          autoFocus
          placeholder="Nombre, sobrenombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>
      {filtrados.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {filtrados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSeleccionar(c.id)}
                className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span>
                  {c.nombre}
                  {c.sobrenombre && <span className="text-neutral-500"> ({c.sobrenombre})</span>}
                </span>
                {c.telefono && <span className="text-xs text-neutral-500">{c.telefono}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {busqueda.trim() !== "" && filtrados.length === 0 && (
        <p className="text-xs text-neutral-500">Sin resultados.</p>
      )}
    </div>
  );
}
