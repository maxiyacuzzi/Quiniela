"use client";

import { useState, useTransition } from "react";
import { MODALIDAD_LABEL } from "@/lib/quini6/modalidades";
import { formatearFechaLegible } from "@/lib/fechas";
import { FechaSorteoQuini6 } from "@/lib/quini6/scraper";
import SelectorNumeros from "./SelectorNumeros";
import SubirTicketQuini6 from "./SubirTicketQuini6";
import { controlarJugadaQuini6Action, ControlQuini6Output } from "./controlar-actions";

export default function ControlarJugadaQuini6({
  fechas,
  fechaInicial,
}: {
  fechas: FechaSorteoQuini6[];
  fechaInicial: string;
}) {
  const [fecha, setFecha] = useState(fechaInicial);
  const [numeros, setNumeros] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ControlQuini6Output | null>(null);
  const [error, setError] = useState<string | null>(null);

  const indice = fechas.findIndex((f) => f.fecha === fecha);
  const hayAnterior = indice > 0;
  const haySiguiente = indice >= 0 && indice < fechas.length - 1;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    startTransition(async () => {
      try {
        const r = await controlarJugadaQuini6Action(fecha, numeros);
        setResultado(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al controlar la jugada");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60"
      >
        <div className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Sorteo a controlar
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => hayAnterior && setFecha(fechas[indice - 1].fecha)}
              disabled={!hayAnterior}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              ← Anterior
            </button>
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {formatearFechaLegible(fecha)}
              {fechas[indice]?.sorteo && ` — Sorteo N° ${fechas[indice].sorteo}`}
            </span>
            <button
              type="button"
              onClick={() => haySiguiente && setFecha(fechas[indice + 1].fecha)}
              disabled={!haySiguiente}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Siguiente →
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-neutral-700 dark:text-neutral-300">
            Elegí los 6 números jugados
          </p>
          <SelectorNumeros seleccionados={numeros} onChange={setNumeros} max={6} />
        </div>

        <button
          type="submit"
          disabled={isPending || numeros.length !== 6}
          className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
        >
          {isPending ? "Controlando..." : "Controlar"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {resultado && (
        <div className="flex flex-col gap-3">
          {resultado.sorteo && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Sorteo N° {resultado.sorteo}
            </p>
          )}
          {resultado.resultados.some((r) => r.aciertos >= 4) && (
            <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-center dark:border-green-700 dark:bg-green-900/20">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                🎉 ¡Felicitaciones, tiene premio!
              </p>
            </div>
          )}
          {resultado.resultados.map((r) => (
            <div
              key={r.modalidad}
              className={`rounded-xl border p-4 ${
                r.aciertos >= 4
                  ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                  : "border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {MODALIDAD_LABEL[r.modalidad]}
                </h3>
                <span
                  className={`text-lg font-bold ${
                    r.aciertos >= 4
                      ? "text-green-600 dark:text-green-400"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {r.aciertos} acierto{r.aciertos === 1 ? "" : "s"}
                </span>
              </div>
              {r.numerosCoincidentes.length > 0 && (
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  Coincidieron: {r.numerosCoincidentes.join(", ")}
                </p>
              )}
            </div>
          ))}
          <p className="text-xs text-neutral-500">
            Resultado informativo — la agencia valida el premio real con su sistema.
          </p>
        </div>
      )}

      <SubirTicketQuini6 />
    </div>
  );
}
