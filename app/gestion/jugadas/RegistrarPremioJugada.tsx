"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Juego } from "@/lib/actividad-clientes";
import { MEDIOS_PAGO_PREMIO, MEDIO_PAGO_PREMIO_LABEL, MedioPagoPremio } from "@/lib/medios-pago";
import { cargarPremioAction } from "./actions";

function formatearMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

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
  const [medioPago, setMedioPago] = useState<MedioPagoPremio>("efectivo");
  const [montoEfectivo, setMontoEfectivo] = useState("");
  const [montoTransferencia, setMontoTransferencia] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const montoNumero = Number(monto);
  const faltanteMixto =
    medioPago === "mixto" && Number.isFinite(montoNumero)
      ? montoNumero - (Number(montoEfectivo || 0) + Number(montoTransferencia || 0))
      : 0;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError("El monto tiene que ser mayor a 0");
      return;
    }
    if (pagado && medioPago === "mixto" && faltanteMixto !== 0) {
      setError("El efectivo y la transferencia tienen que sumar el total del premio");
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
          montoEfectivo: medioPago === "mixto" ? Number(montoEfectivo) : undefined,
          montoTransferencia: medioPago === "mixto" ? Number(montoTransferencia) : undefined,
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
        <>
          <select
            value={medioPago}
            onChange={(e) => setMedioPago(e.target.value as MedioPagoPremio)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {MEDIOS_PAGO_PREMIO.map((m) => (
              <option key={m} value={m}>
                {MEDIO_PAGO_PREMIO_LABEL[m]}
              </option>
            ))}
          </select>

          {medioPago === "mixto" && (
            <>
              <label className="flex flex-col gap-1 text-neutral-700 dark:text-neutral-300">
                En efectivo
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={montoEfectivo}
                  onChange={(e) => setMontoEfectivo(e.target.value)}
                  className="w-24 rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-neutral-700 dark:text-neutral-300">
                Transferencia
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={montoTransferencia}
                  onChange={(e) => setMontoTransferencia(e.target.value)}
                  className="w-24 rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              {faltanteMixto !== 0 && (
                <p
                  className={`w-full ${faltanteMixto > 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
                >
                  {faltanteMixto > 0
                    ? `Falta ${formatearMonto(faltanteMixto)}`
                    : `Sobra ${formatearMonto(Math.abs(faltanteMixto))}`}
                </p>
              )}
            </>
          )}
        </>
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
