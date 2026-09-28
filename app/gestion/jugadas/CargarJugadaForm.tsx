"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { JUEGOS, JUEGO_LABEL, Juego } from "@/lib/actividad-clientes";
import { MEDIOS_PAGO, MEDIO_PAGO_LABEL, MedioPago } from "@/lib/medios-pago";
import { cargarJugadaAction } from "./actions";

export default function CargarJugadaForm({ clienteId, hoy }: { clienteId: string; hoy: string }) {
  const router = useRouter();
  const [juego, setJuego] = useState<Juego>("quiniela");
  const [monto, setMonto] = useState("");
  const [fechaSorteo, setFechaSorteo] = useState(hoy);
  const [fiado, setFiado] = useState(false);
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
        await cargarJugadaAction({
          clienteId,
          juego,
          monto: montoNumero,
          fechaSorteo,
          fiado,
          medioPago: fiado ? null : medioPago,
        });
        setMonto("");
        setFiado(false);
        setMedioPago("efectivo");
        setOk(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar la jugada");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60"
    >
      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Cargar jugada
      </h2>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Juego
        <select
          value={juego}
          onChange={(e) => setJuego(e.target.value as Juego)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        >
          {JUEGOS.map((j) => (
            <option key={j} value={j}>
              {JUEGO_LABEL[j]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Fecha del sorteo
        <input
          type="date"
          required
          value={fechaSorteo}
          onChange={(e) => setFechaSorteo(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        <span className="text-xs text-neutral-500">
          Define en qué liquidación entra. La caja la cuenta hoy, que es cuando cobrás.
        </span>
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

      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={fiado}
          onChange={(e) => setFiado(e.target.checked)}
          className="h-4 w-4 accent-red-600"
        />
        Fiado (todavía no me pagó)
      </label>

      {!fiado && (
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
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {ok && <p className="text-sm text-green-600 dark:text-green-400">Jugada cargada.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Cargar jugada"}
      </button>
    </form>
  );
}
