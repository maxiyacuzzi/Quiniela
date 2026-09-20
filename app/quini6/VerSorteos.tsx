"use client";

import { useState, useTransition } from "react";
import { MODALIDADES_ORDEN, MODALIDAD_LABEL } from "@/lib/quini6/modalidades";
import { formatearFechaLegible } from "@/lib/fechas";
import { obtenerSorteoQuini6Action, ObtenerSorteoQuini6Output } from "./ver-sorteos-actions";

export default function VerSorteos({ sorteoInicial }: { sorteoInicial: ObtenerSorteoQuini6Output }) {
  const [sorteo, setSorteo] = useState(sorteoInicial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const indice = sorteo.fechas.findIndex((f) => f.fecha === sorteo.fecha);
  const hayAnterior = indice > 0;
  const haySiguiente = indice >= 0 && indice < sorteo.fechas.length - 1;

  function irA(nuevaFecha: string) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await obtenerSorteoQuini6Action(nuevaFecha);
        setSorteo(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al buscar el sorteo");
      }
    });
  }

  if (sorteo.fechas.length === 0) {
    return (
      <p className="text-center text-neutral-600 dark:text-neutral-400">
        Todavía no hay sorteos de Quini 6 guardados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => hayAnterior && irA(sorteo.fechas[indice - 1].fecha)}
            disabled={!hayAnterior || isPending}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={() => haySiguiente && irA(sorteo.fechas[indice + 1].fecha)}
            disabled={!haySiguiente || isPending}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Siguiente →
          </button>
        </div>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatearFechaLegible(sorteo.fecha)}
          {sorteo.sorteo && ` — Sorteo N° ${sorteo.sorteo}`}
        </div>
      </div>

      {isPending && <p className="text-sm text-neutral-500">Buscando...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!isPending && !sorteo.disponible && (
        <p className="text-center text-neutral-600 dark:text-neutral-400">
          No hay datos guardados para este sorteo todavía.
        </p>
      )}

      {!isPending && sorteo.disponible && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MODALIDADES_ORDEN.map((m) => (
            <div
              key={m}
              className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60"
            >
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
                {MODALIDAD_LABEL[m]}
              </h3>
              <div className="flex flex-wrap gap-2">
                {sorteo.modalidades[m].map((n, i) => (
                  <span
                    key={i}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-mono text-sm font-bold text-white"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
