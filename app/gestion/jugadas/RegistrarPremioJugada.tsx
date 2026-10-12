"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Juego } from "@/lib/actividad-clientes";
import { MEDIO_PAGO_PREMIO_LABEL, MedioPagoPremio } from "@/lib/medios-pago";
import { calcularNetoPremio } from "@/lib/deuda-premio";
import { cargarPremioAction } from "./actions";

function formatearMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

// Cómo pagar lo que no cubre la deuda (o el total, si no debía nada) — "A
// cuenta" no se elige: se aplica solo, ver calcularNetoPremio.
type MedioNeto = "efectivo" | "transferencia" | "mixto";
const MEDIOS_NETO: MedioNeto[] = ["efectivo", "transferencia", "mixto"];

export default function RegistrarPremioJugada({
  jugadaId,
  clienteId,
  clienteSaldo,
  juego,
}: {
  jugadaId: string;
  clienteId: string;
  clienteSaldo: number; // positivo: el cliente debe
  juego: Juego;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [pagado, setPagado] = useState(true);
  const [medioNeto, setMedioNeto] = useState<MedioNeto>("efectivo");
  const [montoEfectivoNeto, setMontoEfectivoNeto] = useState("");
  const [montoTransferenciaNeto, setMontoTransferenciaNeto] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const montoNumero = Number(monto);
  const { montoACuenta, neto, deudaRestante } = calcularNetoPremio(montoNumero, clienteSaldo);
  const faltanteNeto =
    medioNeto === "mixto"
      ? neto - (Number(montoEfectivoNeto || 0) + Number(montoTransferenciaNeto || 0))
      : 0;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError("El monto tiene que ser mayor a 0");
      return;
    }
    if (pagado && neto > 0 && medioNeto === "mixto" && faltanteNeto !== 0) {
      setError("El efectivo y la transferencia tienen que sumar lo que hay que pagarle en mano");
      return;
    }

    startTransition(async () => {
      try {
        let medioPago: MedioPagoPremio | null = null;
        let montoEfectivo: number | undefined;
        let montoTransferencia: number | undefined;

        if (pagado) {
          if (montoACuenta > 0 && neto === 0) {
            medioPago = "cuenta";
          } else if (montoACuenta > 0) {
            medioPago = "mixto";
            if (medioNeto === "mixto") {
              montoEfectivo = Number(montoEfectivoNeto || 0);
              montoTransferencia = Number(montoTransferenciaNeto || 0);
            } else if (medioNeto === "efectivo") {
              montoEfectivo = neto;
              montoTransferencia = 0;
            } else {
              montoTransferencia = neto;
              montoEfectivo = 0;
            }
          } else {
            medioPago = medioNeto;
            if (medioNeto === "mixto") {
              montoEfectivo = Number(montoEfectivoNeto || 0);
              montoTransferencia = Number(montoTransferenciaNeto || 0);
            }
          }
        }

        await cargarPremioAction({
          clienteId,
          juego,
          descripcion: "Premio de esta jugada",
          monto: montoNumero,
          pagado,
          medioPago,
          montoEfectivo,
          montoTransferencia,
          montoCuenta: pagado && montoACuenta > 0 ? montoACuenta : undefined,
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
      {clienteSaldo > 0 && (
        <p className="w-full rounded-lg bg-amber-100 px-2 py-1.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-400">
          Te debe {formatearMonto(clienteSaldo)}.
        </p>
      )}

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

      {pagado && montoNumero > 0 && clienteSaldo > 0 && (
        <p className="w-full rounded-lg bg-amber-100 px-2 py-1.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-400">
          {deudaRestante > 0
            ? `El premio no alcanza a cubrir toda la deuda: se descuenta ${formatearMonto(montoACuenta)} y todavía te va a deber ${formatearMonto(deudaRestante)}.`
            : neto > 0
              ? `Se cancela la deuda con este premio. Hay que pagarle ${formatearMonto(neto)}.`
              : "Se cancela la deuda justo con este premio: no hay que pagarle nada en mano."}
        </p>
      )}

      {pagado && montoNumero > 0 && neto > 0 && (
        <>
          <select
            value={medioNeto}
            onChange={(e) => setMedioNeto(e.target.value as MedioNeto)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {MEDIOS_NETO.map((m) => (
              <option key={m} value={m}>
                {m === "mixto" ? "Mixto (efectivo + transferencia)" : MEDIO_PAGO_PREMIO_LABEL[m]}
              </option>
            ))}
          </select>

          {medioNeto === "mixto" && (
            <>
              <label className="flex flex-col gap-1 text-neutral-700 dark:text-neutral-300">
                En efectivo
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={montoEfectivoNeto}
                  onChange={(e) => setMontoEfectivoNeto(e.target.value)}
                  className="w-24 rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-neutral-700 dark:text-neutral-300">
                Transferencia
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={montoTransferenciaNeto}
                  onChange={(e) => setMontoTransferenciaNeto(e.target.value)}
                  className="w-24 rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              {faltanteNeto !== 0 && (
                <p
                  className={`w-full ${faltanteNeto > 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
                >
                  {faltanteNeto > 0
                    ? `Falta ${formatearMonto(faltanteNeto)}`
                    : `Sobra ${formatearMonto(Math.abs(faltanteNeto))}`}
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
