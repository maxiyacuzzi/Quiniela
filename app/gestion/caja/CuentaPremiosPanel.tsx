"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CuentaPremios } from "@/lib/cuenta-premios";
import { getFechaHoyArgentina } from "@/lib/fechas";
import { agregarMovimientoCuentaPremiosAction } from "./actions";

type Signo = "deposito" | "pago";

function formatearMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CuentaPremiosPanel({ cuenta }: { cuenta: CuentaPremios }) {
  const router = useRouter();
  const [fecha, setFecha] = useState(getFechaHoyArgentina());
  const [signo, setSigno] = useState<Signo>("deposito");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
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
        await agregarMovimientoCuentaPremiosAction({
          fecha,
          monto: signo === "deposito" ? montoNumero : -montoNumero,
          concepto,
        });
        setMonto("");
        setConcepto("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al agregar el movimiento");
      }
    });
  }

  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="p-4 pb-0">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Cuenta de premios (Córdoba)
        </h2>
        <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {formatearMonto(cuenta.saldo)}
        </p>
        <p className="text-xs text-neutral-500">
          Saldo acumulado — independiente de la caja y de los premios de clientes.
        </p>
      </div>

      {cuenta.movimientos.length === 0 ? (
        <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">Sin movimientos.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
          {cuenta.movimientos.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm text-neutral-800 dark:text-neutral-200">{m.concepto}</p>
                <p className="text-xs text-neutral-500">
                  {formatearFechaHora(m.creadoEn)}
                  {m.creadoPor && ` — ${m.creadoPor}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold ${
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

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 items-end gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800 sm:grid-cols-5"
      >
        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Tipo
          <select
            value={signo}
            onChange={(e) => setSigno(e.target.value as Signo)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            <option value="deposito">Depósito (ingreso)</option>
            <option value="pago">Retiro / pago (egreso)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300 sm:col-span-2">
          Concepto
          <input
            type="text"
            required
            placeholder="Ej: depósito visto en el resumen del 24/9"
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

        {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-5">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60 sm:col-span-5"
        >
          {isPending ? "Guardando..." : "Agregar movimiento"}
        </button>
      </form>
    </div>
  );
}
