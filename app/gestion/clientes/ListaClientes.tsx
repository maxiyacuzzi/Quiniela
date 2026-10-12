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

type FiltroDeuda = "todos" | "me-deben" | "les-debo" | "sin-saldo";
type Orden = "nombre-az" | "nombre-za" | "mas-deuda" | "mas-a-favor";

const FILTROS: { valor: FiltroDeuda; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "me-deben", label: "Me deben" },
  { valor: "les-debo", label: "Les debo" },
  { valor: "sin-saldo", label: "Sin saldo" },
];

const ORDENES: { valor: Orden; label: string }[] = [
  { valor: "nombre-az", label: "Nombre (A-Z)" },
  { valor: "nombre-za", label: "Nombre (Z-A)" },
  { valor: "mas-deuda", label: "El que más me debe primero" },
  { valor: "mas-a-favor", label: "Al que más le debo primero" },
];

export default function ListaClientes({ clientes }: { clientes: ClienteConSaldo[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroDeuda>("todos");
  const [orden, setOrden] = useState<Orden>("nombre-az");
  const [soloActivos, setSoloActivos] = useState(true);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    let lista = clientes.filter((c) => {
      if (soloActivos && !c.activo) return false;
      if (filtro === "me-deben" && !(c.saldo > 0)) return false;
      if (filtro === "les-debo" && !(c.saldo < 0)) return false;
      if (filtro === "sin-saldo" && c.saldo !== 0) return false;
      if (
        q &&
        !(
          c.nombre.toLowerCase().includes(q) ||
          c.sobrenombre?.toLowerCase().includes(q) ||
          c.telefono?.includes(q)
        )
      ) {
        return false;
      }
      return true;
    });

    lista = [...lista].sort((a, b) => {
      switch (orden) {
        case "nombre-za":
          return b.nombre.localeCompare(a.nombre, "es");
        case "mas-deuda":
          return b.saldo - a.saldo;
        case "mas-a-favor":
          return a.saldo - b.saldo;
        default:
          return a.nombre.localeCompare(b.nombre, "es");
      }
    });

    return lista;
  }, [clientes, busqueda, filtro, orden, soloActivos]);

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

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              filtro === f.valor
                ? "border-red-600 bg-red-600 text-white"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {f.label}
          </button>
        ))}

        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as Orden)}
          className="ml-auto rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        >
          {ORDENES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => setSoloActivos(e.target.checked)}
            className="h-3.5 w-3.5 accent-red-600"
          />
          Solo activos
        </label>
      </div>

      {filtrados.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          No hay clientes que cumplan con ese filtro.
        </p>
      ) : (
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
      )}
    </div>
  );
}
