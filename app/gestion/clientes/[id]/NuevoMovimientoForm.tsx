"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MEDIOS_PAGO, MEDIO_PAGO_LABEL, MedioPago } from "@/lib/medios-pago";
import { agregarMovimientoAction } from "../actions";

type Signo = "debe" | "haber";

export default function NuevoMovimientoForm({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [signo, setSigno] = useState<Signo>("debe");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError("El monto tiene que ser un número mayor a 0");
      return;
    }

    startTransition(async () => {
      try {
        await agregarMovimientoAction({
          clienteId,
          monto: signo === "debe" ? montoNumero : -montoNumero,
          concepto,
          medioPago,
        });
        setMonto("");
        setConcepto("");
        setMedioPago("efectivo");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al agregar el movimiento");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 items-end gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60 sm:grid-cols-5"
    >
      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 sm:col-span-5">
        Nuevo movimiento
      </h2>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Tipo
        <select
          value={signo}
          onChange={(e) => setSigno(e.target.value as Signo)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        >
          <option value="debe">Me debe (le fié)</option>
          <option value="haber">Le debo (ej. premio)</option>
        </select>
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

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300 sm:col-span-2">
        Concepto
        <input
          type="text"
          required
          placeholder="Ej: fiado jugada del 23/9"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
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
  );
}
