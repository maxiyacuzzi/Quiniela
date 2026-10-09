"use client";

import { useState, useTransition } from "react";
import { CorteCaja } from "@/lib/caja";
import { MEDIOS_PAGO, MEDIO_PAGO_LABEL, MedioPago } from "@/lib/medios-pago";
import { agregarMovimientoCajaAction } from "./actions";

type Signo = "ingreso" | "gasto";

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MovimientosCajaForm({
  corte,
  onGuardado,
}: {
  corte: CorteCaja & { existe: true };
  onGuardado: () => void;
}) {
  const [signo, setSigno] = useState<Signo>("gasto");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError("El monto tiene que ser mayor a 0");
      return;
    }

    startTransition(async () => {
      try {
        await agregarMovimientoCajaAction({
          corteId: corte.id,
          concepto,
          monto: signo === "ingreso" ? montoNumero : -montoNumero,
          medioPago,
        });
        setConcepto("");
        setMonto("");
        setMedioPago("efectivo");
        onGuardado();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al agregar el movimiento");
      }
    });
  }

  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
      <h2 className="p-4 pb-0 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Ingresos y gastos sueltos
      </h2>

      {corte.movimientos.length === 0 ? (
        <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">Sin movimientos.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {corte.movimientos.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm text-neutral-800 dark:text-neutral-200">{m.concepto}</p>
                <p className="text-xs text-neutral-500">
                  {formatearFechaHora(m.creadoEn)}
                  {m.creadoPor && ` — ${m.creadoPor}`}
                  {` — ${MEDIO_PAGO_LABEL[m.medioPago]}`}
                </p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  m.monto > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {m.monto > 0 ? "+" : "-"}${Math.abs(m.monto).toLocaleString("es-AR")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!corte.cerrado && (
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 items-end gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800 sm:grid-cols-5"
        >
          <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            Tipo
            <select
              value={signo}
              onChange={(e) => setSigno(e.target.value as Signo)}
              className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            >
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso extra</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300 sm:col-span-2">
            Concepto
            <input
              type="text"
              required
              placeholder="Ej: compra de rollos de papel"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            Monto
            <input
              type="number"
              inputMode="numeric"
              min={0}
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            Medio de pago
            <select
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as MedioPago)}
              className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            >
              {MEDIOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {MEDIO_PAGO_LABEL[m]}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-5">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60 sm:col-span-5"
          >
            {isPending ? "Guardando..." : "Agregar movimiento"}
          </button>
        </form>
      )}
    </div>
  );
}
