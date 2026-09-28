"use client";

import { useState, useTransition } from "react";
import { ClienteConSaldo } from "@/lib/clientes";
import { MEDIOS_PAGO, MEDIO_PAGO_LABEL, MedioPago } from "@/lib/medios-pago";
import ClientePicker from "../jugadas/ClientePicker";
import { cobrarDeudaClienteAction } from "./actions";

function formatearMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export default function CobroDeudaForm({
  clientes,
  onGuardado,
}: {
  clientes: ClienteConSaldo[];
  onGuardado: () => void;
}) {
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const deuda = cliente && cliente.saldo > 0 ? cliente.saldo : 0;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!cliente) {
      setError("Elegí un cliente");
      return;
    }
    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError("El monto tiene que ser mayor a 0");
      return;
    }

    startTransition(async () => {
      try {
        await cobrarDeudaClienteAction({ clienteId: cliente.id, monto: montoNumero, medioPago });
        setOk(`Cobro de ${formatearMonto(montoNumero)} registrado a ${cliente.nombre}.`);
        setMonto("");
        setMedioPago("efectivo");
        onGuardado();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar el cobro");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Cobrar deuda de un cliente
      </h2>

      <ClientePicker clientes={clientes} clienteSeleccionado={cliente} onSeleccionar={setClienteId} />

      {cliente && (
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 sm:col-span-3">
            {deuda > 0
              ? `${cliente.nombre} te debe ${formatearMonto(deuda)}.`
              : `${cliente.nombre} no tiene deuda (si cobrás igual, queda saldo a su favor).`}
          </p>

          <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            Monto cobrado
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
            {isPending ? "Guardando..." : "Registrar cobro"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {ok && <p className="text-sm text-green-600 dark:text-green-400">{ok}</p>}
      <p className="text-xs text-neutral-500">
        Baja el saldo del cliente y suma a la caja del turno actual (efectivo al cajón,
        transferencia a transferencias).
      </p>
    </div>
  );
}
