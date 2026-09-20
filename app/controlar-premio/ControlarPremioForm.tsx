"use client";

import { useState, useTransition } from "react";
import { JURISDICCIONES } from "@/lib/jurisdicciones";
import { TURNOS_ORDEN, TURNO_LABEL, TurnoKey } from "@/lib/turnos";
import { TipoControlPremio } from "@/lib/premio";
import { controlarPremioAction, ControlPremioOutput } from "./actions";

export default function ControlarPremioForm({ hoy }: { hoy: string }) {
  const [fecha, setFecha] = useState(hoy);
  const [jurisdiccionSlug, setJurisdiccionSlug] = useState(JURISDICCIONES[0].slug);
  const [turno, setTurno] = useState<TurnoKey>("previa");
  const [tipo, setTipo] = useState<TipoControlPremio>("cabeza");
  const [numeroJugado, setNumeroJugado] = useState("");
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ControlPremioOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    startTransition(async () => {
      try {
        const r = await controlarPremioAction({ fecha, jurisdiccionSlug, turno, numeroJugado, tipo });
        setResultado(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al controlar el premio");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 items-end gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Fecha
          <input
            type="date"
            value={fecha}
            max={hoy}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Jurisdicción
          <select
            value={jurisdiccionSlug}
            onChange={(e) => setJurisdiccionSlug(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {JURISDICCIONES.map((j) => (
              <option key={j.slug} value={j.slug}>
                {j.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Turno
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value as TurnoKey)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {TURNOS_ORDEN.map((t) => (
              <option key={t} value={t}>
                {TURNO_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoControlPremio)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            <option value="cabeza">A la cabeza</option>
            <option value="cualquiera">Primeros 10</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Número jugado
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="Ej: 452"
            value={numeroJugado}
            onChange={(e) => setNumeroJugado(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-mono text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </label>

        <button
          type="submit"
          disabled={isPending || numeroJugado.length < 2}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60 sm:col-span-2 lg:col-span-5"
        >
          {isPending ? "Controlando..." : "Controlar"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {resultado && (
        <div
          className={`rounded-xl border p-6 text-center ${
            resultado.gano
              ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
              : "border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60"
          }`}
        >
          <p
            className={`text-2xl font-bold ${
              resultado.gano
                ? "text-green-600 dark:text-green-400"
                : "text-neutral-700 dark:text-neutral-300"
            }`}
          >
            {resultado.gano ? "¡Ganó!" : "No ganó"}
          </p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {resultado.nombreJurisdiccion} — {TURNO_LABEL[turno]} — jugado a {resultado.cifras} cifras
          </p>

          {resultado.gano && (
            <ul className="mt-4 flex flex-col items-center gap-1 text-sm text-neutral-700 dark:text-neutral-300">
              {resultado.coincidencias.map((c) => (
                <li key={c.posicion} className="font-mono">
                  Posición {c.posicion}
                  {c.posicion === 1 ? " (la cabeza)" : ""}:{" "}
                  <span className="font-bold text-green-600 dark:text-green-400">{c.numero}</span>
                </li>
              ))}
            </ul>
          )}

          <ol className="mt-6 grid grid-cols-5 gap-2 text-xs text-neutral-500">
            {resultado.numerosDelTurno.map((n, i) => (
              <li key={i} className={`font-mono ${i === 0 ? "text-red-600 dark:text-red-500" : ""}`}>
                {i + 1}. {n ?? "—"}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
