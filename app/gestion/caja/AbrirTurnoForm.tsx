"use client";

import { useState, useTransition } from "react";
import { CorteCaja, TurnoCaja } from "@/lib/caja";
import { abrirCorteAction } from "./actions";

function formatearMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

// La caja en efectivo ya no hereda el saldo del corte anterior: cada turno
// es un fondo fijo que el dueño define a mano al abrirlo. Hasta que no se
// abre, no se le pueden agregar movimientos sueltos ni cerrarlo — pero sí se
// puede ver lo esperado con lo que ya se cargó en Jugadas/Ventas.
export default function AbrirTurnoForm({
  fecha,
  turno,
  esDueno,
  sugerenciaMontoInicial,
  montoEsperadoSinFondo,
  totalTransferencias,
  onAbierto,
}: {
  fecha: string;
  turno: TurnoCaja;
  esDueno: boolean;
  sugerenciaMontoInicial: number;
  montoEsperadoSinFondo: number;
  totalTransferencias: number;
  onAbierto: (corte: CorteCaja) => void;
}) {
  const [monto, setMonto] = useState(String(sugerenciaMontoInicial));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero < 0) {
      setError("El monto inicial tiene que ser 0 o más");
      return;
    }
    startTransition(async () => {
      try {
        const corte = await abrirCorteAction(fecha, turno, montoNumero);
        onAbierto(corte);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al abrir el turno");
      }
    });
  }

  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Este turno todavía no se abrió
      </p>

      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-neutral-500">Esperado en efectivo sin fondo inicial</p>
          <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            {formatearMonto(montoEsperadoSinFondo)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Saldo esperado en transferencias</p>
          <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            {formatearMonto(totalTransferencias)}
          </p>
        </div>
      </div>

      {esDueno ? (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            Monto inicial en efectivo (fondo fijo con el que arranca este turno)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
          >
            {isPending ? "Abriendo..." : "Abrir turno"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          Pedile al dueño que lo abra con el monto inicial en efectivo.
        </p>
      )}
    </div>
  );
}
