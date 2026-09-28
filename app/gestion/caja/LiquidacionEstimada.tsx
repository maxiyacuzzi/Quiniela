"use client";

import { useState, useTransition } from "react";
import { JUEGO_LABEL } from "@/lib/actividad-clientes";
import { LiquidacionDia, PORCENTAJE_LOTERIA } from "@/lib/liquidacion";
import { formatearFechaLegible, restarDias, getFechaHoyArgentina } from "@/lib/fechas";
import { obtenerLiquidacionDiaAction } from "./actions";

function formatearMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export default function LiquidacionEstimada({
  liquidacionInicial,
}: {
  liquidacionInicial: LiquidacionDia;
}) {
  const [fecha, setFecha] = useState(liquidacionInicial.fecha);
  const [liquidacion, setLiquidacion] = useState(liquidacionInicial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function buscar(nuevaFecha: string) {
    setFecha(nuevaFecha);
    setError(null);
    startTransition(async () => {
      try {
        const r = await obtenerLiquidacionDiaAction(nuevaFecha);
        setLiquidacion(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al calcular la liquidación");
      }
    });
  }

  const juegosConVentas = liquidacion.porJuego.filter((j) => j.ventas > 0 || j.premiosBrutos > 0);

  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Liquidación estimada ({PORCENTAJE_LOTERIA}% lotería / {100 - PORCENTAJE_LOTERIA}% agencia)
        </h2>
        <input
          type="date"
          value={fecha}
          max={getFechaHoyArgentina()}
          onChange={(e) => buscar(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        Solo de referencia, para comparar contra el memo real de la lotería — no crea ningún
        movimiento solo.
      </p>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {isPending && <p className="mt-2 text-sm text-neutral-500">Calculando...</p>}

      {!isPending && (
        <div className="mt-3 flex flex-col gap-2">
          {juegosConVentas.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              No hay ventas ni premios cargados para el {formatearFechaLegible(fecha)}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500">
                  <th className="pb-1">Juego</th>
                  <th className="pb-1 text-right">Ventas</th>
                  <th className="pb-1 text-right">Depósito ({PORCENTAJE_LOTERIA}%)</th>
                  <th className="pb-1 text-right">Premios (netos)</th>
                  <th className="pb-1 text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {juegosConVentas.map((j) => (
                  <tr key={j.juego} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="py-1 text-neutral-800 dark:text-neutral-200">
                      {JUEGO_LABEL[j.juego]}
                    </td>
                    <td className="py-1 text-right text-neutral-700 dark:text-neutral-300">
                      {formatearMonto(j.ventas)}
                    </td>
                    <td className="py-1 text-right text-neutral-700 dark:text-neutral-300">
                      {formatearMonto(j.depositoEsperado)}
                    </td>
                    <td className="py-1 text-right text-neutral-700 dark:text-neutral-300">
                      {formatearMonto(j.premiosNetos)}
                      {j.premiosBrutos > 0 && (
                        <p className="text-xs font-normal text-neutral-500">
                          bruto {formatearMonto(j.premiosBrutos)} − {j.impuestoPremio}%
                        </p>
                      )}
                    </td>
                    <td
                      className={`py-1 text-right font-semibold ${
                        j.neto > 0
                          ? "text-red-600 dark:text-red-400"
                          : j.neto < 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {formatearMonto(j.neto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-2 border-t border-neutral-300 pt-2 text-right dark:border-neutral-700">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Neto total: </span>
            <span
              className={`text-lg font-bold ${
                liquidacion.netoTotal > 0
                  ? "text-red-600 dark:text-red-400"
                  : liquidacion.netoTotal < 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-neutral-700 dark:text-neutral-300"
              }`}
            >
              {formatearMonto(Math.abs(liquidacion.netoTotal))}
            </span>
            <p className="text-xs text-neutral-500">
              {liquidacion.netoTotal > 0
                ? "Esperarías depositar este monto a la lotería."
                : liquidacion.netoTotal < 0
                  ? "La lotería te acreditaría este monto."
                  : "No hay nada que depositar ni cobrar."}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => buscar(restarDias(fecha, 1))}
        disabled={isPending}
        className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        ← Día anterior
      </button>
    </div>
  );
}
