"use client";

import { useRef, useState, useTransition } from "react";
import { TURNO_LABEL } from "@/lib/turnos";
import { JURISDICCIONES } from "@/lib/jurisdicciones";
import { procesarTicketAction, ResultadoJugadaTicket } from "./ticket-actions";

const NOMBRE_JURISDICCION: Record<string, string> = Object.fromEntries(
  JURISDICCIONES.map((j) => [j.slug, j.nombre])
);

function leerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SubirTicket() {
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadoJugadaTicket[] | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);

  function onSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResultados(null);
    setNombreArchivo(file.name);

    startTransition(async () => {
      try {
        const base64 = await leerComoBase64(file);
        const r = await procesarTicketAction(base64, file.type || "image/jpeg");
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
            Lee automáticamente las jugadas del ticket y las controla. Este control es solo
            informativo — la agencia valida el premio real con su sistema.
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
          {resultados.map((r, i) => (
            <li
              key={i}
              className={`rounded-lg border p-3 ${
                !r.valido
                  ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/10"
                  : r.control?.gano
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
                    Leído: {r.extraido.jurisdiccionTexto} / {r.extraido.turnoTexto} / N°{" "}
                    {r.extraido.numeroJugado ?? "?"} — usá el formulario de arriba para
                    controlarla a mano.
                  </p>
                </div>
              ) : (
                <div>
                  <p
                    className={`text-lg font-bold ${
                      r.control!.gano
                        ? "text-green-600 dark:text-green-400"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {r.control!.gano ? "¡Ganó!" : "No ganó"}
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {NOMBRE_JURISDICCION[r.extraido.jurisdiccionSlug!]} —{" "}
                    {TURNO_LABEL[r.extraido.turno!]} — N° {r.extraido.numeroJugado} (
                    {r.extraido.tipo === "cabeza" ? "a la cabeza" : "primeros 10"}) —{" "}
                    {r.extraido.fecha}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
