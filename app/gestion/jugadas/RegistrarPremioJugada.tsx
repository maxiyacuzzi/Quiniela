"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Juego } from "@/lib/actividad-clientes";
import { MEDIOS_PAGO, MEDIO_PAGO_LABEL, MedioPago } from "@/lib/medios-pago";
import { cargarPremioAction } from "./actions";

export default function RegistrarPremioJugada({
  jugadaId,
  clienteId,
  juego,
}: {
  jugadaId: string;
  clienteId: string;
  juego: Juego;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [pagado, setPagado] = useState(true);
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
        await cargarPremioAction({
          clienteId,
          juego,
          descripcion: "Premio de esta jugada",
          monto: montoNumero,
          pagado,
          medioPago: pagado ? medioPago : null,
          jugadaId,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar el premio");
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-2 self-start rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        ¿Tuvo premio?
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-2 flex flex-wrap items-end gap-2 border-t border-neutral-200 pt-2 text-xs dark:border-neutral-800"
    >
      <label className="flex flex-col gap-1 text-neutral-700 dark:text-neutral-300">
        Monto ganado
        <input
          type="number"
          inputMode="numeric"
          min={0}
          required
          autoFocus
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-28 rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      <label className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={pagado}
          onChange={(e) => setPagado(e.target.checked)}
          className="h-4 w-4 accent-red-600"
        />
        Ya se lo pagué
      </label>

      {pagado && (
        <select
          value={medioPago}
          onChange={(e) => setMedioPago(e.target.value as MedioPago)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        >
          {MEDIOS_PAGO.map((m) => (
            <option key={m} value={m}>
              {MEDIO_PAGO_LABEL[m]}
            </option>
          ))}
        </select>
      )}

      {error && <p className="w-full text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Registrar premio"}
      </button>
      <button
        type="button"
        onClick={() => setAbierto(false)}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        Cancelar
      </button>
    </form>
  );
}
