"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MEDIOS_PAGO, MEDIO_PAGO_LABEL, MedioPago } from "@/lib/medios-pago";
import { cargarVentaMostradorAction } from "./actions";

export default function VentaMostradorForm({ hoy }: { hoy: string }) {
  const router = useRouter();
  const [fecha, setFecha] = useState(hoy);
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);

    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError("El monto tiene que ser mayor a 0");
      return;
    }

    startTransition(async () => {
      try {
        await cargarVentaMostradorAction({ fecha, monto: montoNumero, medioPago });
        setMonto("");
        setMedioPago("efectivo");
        setOk(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar la venta");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 items-end gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60 sm:grid-cols-4"
    >
      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 sm:col-span-4">
        Venta de mostrador (sin cliente)
      </h2>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Fecha del sorteo
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
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

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Cargar venta"}
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-4">{error}</p>}
      {ok && <p className="text-sm text-green-600 dark:text-green-400 sm:col-span-4">Venta cargada.</p>}

      <p className="text-xs text-neutral-500 sm:col-span-4">
        Si la fecha es de mañana (jugada anticipada para el sorteo temprano), se suma sola a la
        caja de mañana, no a la de hoy.
      </p>
    </form>
  );
}
