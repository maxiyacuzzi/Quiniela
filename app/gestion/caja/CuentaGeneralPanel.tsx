"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CuentaGeneral, TipoMovimientoCuentaGeneral } from "@/lib/cuenta-general";
import { agregarMovimientoCuentaGeneralAction, agregarMovimientoCajaAction } from "./actions";

type Signo = "ingreso" | "egreso";
type Medio = "efectivo" | "transferencia";

const TIPO_LABEL: Record<TipoMovimientoCuentaGeneral, string> = {
  apertura: "Apertura de turno",
  cierre: "Cierre de turno",
  premio: "Premio que superó la caja",
  manual: "Ajuste manual",
};

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

export default function CuentaGeneralPanel({
  cuenta,
  saldoTransferencia,
  corteId,
}: {
  cuenta: CuentaGeneral;
  saldoTransferencia: number;
  // Id del corte de HOY (turno actual), si ya está abierto — un ajuste
  // manual de transferencia se registra ahí, igual que cualquier otro
  // movimiento suelto (ver MovimientosCajaForm): la transferencia no tiene
  // su propio librito, se arma sola a partir de los movimientos de cada corte.
  corteId: string | null;
}) {
  const router = useRouter();
  const [medio, setMedio] = useState<Medio>("efectivo");
  const [signo, setSigno] = useState<Signo>("ingreso");
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

    if (medio === "transferencia" && !corteId) {
      setError("Primero tenés que abrir el turno de hoy para poder ajustar la transferencia.");
      return;
    }

    const montoConSigno = signo === "ingreso" ? montoNumero : -montoNumero;

    startTransition(async () => {
      try {
        if (medio === "efectivo") {
          await agregarMovimientoCuentaGeneralAction({ monto: montoConSigno, concepto });
        } else {
          await agregarMovimientoCajaAction({
            corteId: corteId as string,
            concepto,
            monto: montoConSigno,
            medioPago: "transferencia",
          });
        }
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
          Cuenta general
        </h2>

        <div>
          <p className="text-xs text-neutral-500">Total (efectivo + transferencias)</p>
          <p
            data-campo="saldo-total"
            className="text-3xl font-bold text-neutral-900 dark:text-neutral-100"
          >
            {formatearMonto(cuenta.saldo + saldoTransferencia)}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500">Efectivo</p>
            <p
              data-campo="saldo-efectivo"
              className="text-xl font-semibold text-neutral-800 dark:text-neutral-200"
            >
              {formatearMonto(cuenta.saldo)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Transferencias</p>
            <p
              data-campo="saldo-transferencia"
              className="text-xl font-semibold text-neutral-800 dark:text-neutral-200"
            >
              {formatearMonto(saldoTransferencia)}
            </p>
          </div>
        </div>

        <p className="mt-2 text-xs text-neutral-500">
          Efectivo: la &quot;caja fuerte&quot; — de acá sale el fondo fijo al abrir un turno y
          acá vuelve todo lo contado al cerrarlo; si un premio en efectivo supera la caja, la
          diferencia también sale de acá. Transferencias: saldo bancario esperado, se arrastra
          solo de un turno al siguiente (no tiene apertura/cierre).
        </p>
      </div>

      <p className="px-4 pt-3 text-xs font-medium text-neutral-500">
        Movimientos del efectivo — los ajustes de transferencia aparecen en el detalle del turno
        (&quot;Ingresos y gastos sueltos&quot;)
      </p>

      {cuenta.movimientos.length === 0 ? (
        <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">Sin movimientos.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
          {cuenta.movimientos.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm text-neutral-800 dark:text-neutral-200">{m.concepto}</p>
                <p className="text-xs text-neutral-500">
                  {TIPO_LABEL[m.tipo]} — {formatearFechaHora(m.creadoEn)}
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
          Cuenta
          <select
            value={medio}
            onChange={(e) => setMedio(e.target.value as Medio)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Tipo
          <select
            value={signo}
            onChange={(e) => setSigno(e.target.value as Signo)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            <option value="ingreso">Ingreso (ajuste)</option>
            <option value="egreso">Egreso (ajuste)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300 sm:col-span-2">
          Concepto
          <input
            type="text"
            required
            placeholder="Ej: saldo real guardado al empezar a usar esto"
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

        {medio === "transferencia" && !corteId && (
          <p className="text-xs text-amber-600 dark:text-amber-400 sm:col-span-5">
            El turno de hoy todavía no está abierto: abrilo primero para poder ajustar la
            transferencia.
          </p>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-5">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60 sm:col-span-5"
        >
          {isPending ? "Guardando..." : "Agregar ajuste manual"}
        </button>
      </form>
    </div>
  );
}
