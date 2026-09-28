"use client";

import { useMemo, useState, useTransition } from "react";
import { FilaJurisdiccion } from "@/lib/queries";
import { TURNOS_ORDEN, TURNO_LABEL, TurnoKey } from "@/lib/turnos";
import { formatearFechaLegible, getFechaHoyArgentina } from "@/lib/fechas";
import {
  obtenerResultadosParaEditarAction,
  guardarResultadosAction,
  CambioResultado,
} from "./actions";

function claveCelda(turno: TurnoKey, slug: string, posicion: number) {
  return `${turno}|${slug}|${posicion}`;
}

function filasAValores(filas: FilaJurisdiccion[]): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const fila of filas) {
    for (const turno of TURNOS_ORDEN) {
      fila.porTurno[turno].forEach((numero, i) => {
        valores[claveCelda(turno, fila.slug, i + 1)] = numero ?? "";
      });
    }
  }
  return valores;
}

export default function EditarSorteosClient({
  fechaInicial,
  filasIniciales,
}: {
  fechaInicial: string;
  filasIniciales: FilaJurisdiccion[];
}) {
  const [fecha, setFecha] = useState(fechaInicial);
  const [turno, setTurno] = useState<TurnoKey>("previa");
  const [filas, setFilas] = useState(filasIniciales);
  const [valores, setValores] = useState(() => filasAValores(filasIniciales));
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  function buscar(nuevaFecha: string) {
    setFecha(nuevaFecha);
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      try {
        const r = await obtenerResultadosParaEditarAction(nuevaFecha);
        setFilas(r);
        setValores(filasAValores(r));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al buscar los sorteos");
      }
    });
  }

  function actualizarCelda(slug: string, posicion: number, valor: string) {
    setGuardado(false);
    const limpio = valor.replace(/\D/g, "").slice(0, 4);
    setValores((actual) => ({ ...actual, [claveCelda(turno, slug, posicion)]: limpio }));
  }

  function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);

    const cambios: CambioResultado[] = [];
    for (const fila of filas) {
      for (let posicion = 1; posicion <= 10; posicion++) {
        const valor = valores[claveCelda(turno, fila.slug, posicion)] ?? "";
        if (valor !== "" && valor.length !== 4) {
          setError(`${fila.nombre}, posición ${posicion}: el número tiene que tener 4 cifras`);
          return;
        }
        cambios.push({
          jurisdiccionSlug: fila.slug,
          turno,
          posicion,
          numero: valor === "" ? null : valor,
        });
      }
    }

    startSaving(async () => {
      try {
        await guardarResultadosAction(fecha, cambios);
        setGuardado(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  const posiciones = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Fecha
          <input
            type="date"
            value={fecha}
            max={getFechaHoyArgentina()}
            onChange={(e) => buscar(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </label>
        <span className="text-sm text-neutral-500">{formatearFechaLegible(fecha)}</span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-300 dark:border-neutral-800">
        {TURNOS_ORDEN.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTurno(t);
              setGuardado(false);
            }}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              turno === t
                ? "border-b-2 border-red-600 text-red-600 dark:text-red-500"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {TURNO_LABEL[t]}
          </button>
        ))}
      </div>

      {isPending && <p className="text-sm text-neutral-500">Buscando...</p>}

      {!isPending && (
        <form onSubmit={onGuardar} className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="p-2 text-left text-xs text-neutral-500">Jurisdicción</th>
                  {posiciones.map((p) => (
                    <th key={p} className="p-2 text-center text-xs text-neutral-500">
                      {p}
                      {p === 1 ? " (cabeza)" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.slug} className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="p-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {fila.nombre}
                    </td>
                    {posiciones.map((p) => (
                      <td key={p} className="p-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={valores[claveCelda(turno, fila.slug, p)] ?? ""}
                          onChange={(e) => actualizarCelda(fila.slug, p, e.target.value)}
                          className="w-16 rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-center font-mono text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {guardado && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Guardado — la pantalla pública ya muestra estos valores.
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : `Guardar ${TURNO_LABEL[turno]}`}
          </button>
        </form>
      )}
    </div>
  );
}
