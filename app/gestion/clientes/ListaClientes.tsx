"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClienteConSaldo } from "@/lib/clientes";

function formatearSaldo(saldo: number) {
  const abs = Math.abs(saldo).toLocaleString("es-AR", { minimumFractionDigits: 0 });
  if (saldo > 0) return { texto: `Te debe $${abs}`, clase: "text-red-600 dark:text-red-400" };
  if (saldo < 0) return { texto: `Le debés $${abs}`, clase: "text-green-600 dark:text-green-400" };
  return { texto: "Sin saldo", clase: "text-neutral-500" };
}

export default function ListaClientes({ clientes }: { clientes: ClienteConSaldo[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.sobrenombre?.toLowerCase().includes(q) ||
        c.telefono?.includes(q)
    );
  }, [clientes, busqueda]);

  if (clientes.length === 0) {
    return (
      <p className="text-center text-neutral-600 dark:text-neutral-400">
        Todavía no hay clientes cargados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Buscar por nombre, sobrenombre o teléfono..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
      />

      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-300 bg-neutral-50 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/60">
        {filtrados.map((c) => {
          const saldo = formatearSaldo(c.saldo);
          return (
            <li key={c.id}>
              <Link
                href={`/gestion/clientes/${c.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {c.nombre}
                    {c.sobrenombre && (
                      <span className="text-neutral-500"> ({c.sobrenombre})</span>
                    )}
                    {!c.activo && <span className="text-neutral-500"> — inactivo</span>}
                  </p>
                  {c.telefono && <p className="text-xs text-neutral-500">{c.telefono}</p>}
                </div>
                <span className={`text-sm font-semibold ${saldo.clase}`}>{saldo.texto}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
