"use client";

import { useRef, useState, useTransition } from "react";
import { MODALIDAD_LABEL } from "@/lib/quini6/modalidades";
import { comprimirImagen } from "@/lib/image";
import { procesarTicketQuini6Action, ResultadoJugadaTicketQuini6 } from "./ticket-actions";

export default function SubirTicketQuini6() {
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadoJugadaTicketQuini6[] | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);

  function onSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResultados(null);
    setNombreArchivo(file.name);

    startTransition(async () => {
      try {
        const { base64, mimeType } = await comprimirImagen(file);
        const r = await procesarTicketQuini6Action(base64, mimeType);
        setResultados(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al leer el ticket");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Subir foto del ticket
          </h2>
          <p className="text-xs text-neutral-500">
            Lee automáticamente los números del ticket y los controla. Resultado informativo — la
            agencia valida el premio real con su sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputCamaraRef.current?.click()}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
          >
            {isPending ? "Leyendo..." : "Sacar foto"}
          </button>
          <button
            type="button"
            onClick={() => inputGaleriaRef.current?.click()}
            disabled={isPending}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Elegir de la galería
          </button>
        </div>
        <input
          ref={inputCamaraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onSeleccionarArchivo}
        />
        <input
          ref={inputGaleriaRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onSeleccionarArchivo}
        />
      </div>

      {nombreArchivo && !isPending && (
        <p className="text-xs text-neutral-500">Archivo: {nombreArchivo}</p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {resultados && resultados.length === 0 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          No se detectó ninguna jugada en la foto.
        </p>
      )}

      {resultados && resultados.length > 0 && (
        <ul className="flex flex-col gap-3">
          {resultados.map((r, i) => {
            const gano = r.valido && r.resultados!.some((a) => a.aciertos >= 4);
            return (
            <li
              key={i}
              className={`rounded-lg border p-3 ${
                !r.valido
                  ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/10"
                  : gano
                    ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                    : "border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950"
              }`}
            >
              {!r.valido ? (
                <div>
                  <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                    ⚠ {r.motivoInvalido}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Leído: fecha {r.extraido.fechaTexto || "?"} / números{" "}
                    {r.extraido.numerosTexto.join(", ") || "?"} — usá el formulario de arriba para
                    controlarla a mano.
                  </p>
                </div>
              ) : (
                <div>
                  {gano && (
                    <p className="mb-2 text-base font-bold text-green-600 dark:text-green-400">
                      🎉 ¡Felicitaciones, tiene premio!
                    </p>
                  )}
                  <p className="mb-2 text-xs text-neutral-500">
                    Fecha {r.extraido.fecha} — números {r.extraido.numeros!.join(", ")}
                    {r.sorteo && ` — Sorteo N° ${r.sorteo}`}
                  </p>
                  <div className="flex flex-col gap-1">
                    {r.resultados!.map((a) => (
                      <div key={a.modalidad} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {MODALIDAD_LABEL[a.modalidad]}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            a.aciertos >= 4
                              ? "text-green-600 dark:text-green-400"
                              : "text-neutral-600 dark:text-neutral-400"
                          }`}
                        >
                          {a.aciertos} acierto{a.aciertos === 1 ? "" : "s"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
