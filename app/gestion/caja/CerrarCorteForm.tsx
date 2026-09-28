"use client";

import { useState, useTransition } from "react";
import { CorteCaja } from "@/lib/caja";
import { cerrarCorteAction, reabrirCorteAction } from "./actions";

function formatearMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export default function CerrarCorteForm({
  corte,
  esDueno,
  onGuardado,
}: {
  corte: CorteCaja;
  esDueno: boolean;
  onGuardado: () => void;
}) {
  const [montoContado, setMontoContado] = useState("");
  const [saldoBanco, setSaldoBanco] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const montoContadoNumero = Number(montoContado);
  const diferenciaPreview =
    montoContado.trim() !== "" && Number.isFinite(montoContadoNumero)
      ? montoContadoNumero - corte.montoEsperado
      : null;

  const saldoBancoNumero = Number(saldoBanco);
  const hayBanco = saldoBanco.trim() !== "";
  const difBancoPreview =
    hayBanco && Number.isFinite(saldoBancoNumero)
      ? saldoBancoNumero - corte.totalTransferencias
      : null;

  function onCerrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!Number.isFinite(montoContadoNumero) || montoContadoNumero < 0) {
      setError("El monto contado tiene que ser 0 o más");
      return;
    }

    if (hayBanco && (!Number.isFinite(saldoBancoNumero) || saldoBancoNumero < 0)) {
      setError("El saldo del banco tiene que ser 0 o más");
      return;
    }

    startTransition(async () => {
      try {
        await cerrarCorteAction(corte.id, montoContadoNumero, hayBanco ? saldoBancoNumero : null);
        onGuardado();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cerrar el corte");
      }
    });
  }

  function onReabrir() {
    setError(null);
    startTransition(async () => {
      try {
        await reabrirCorteAction(corte.id);
        onGuardado();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al reabrir el corte");
      }
    });
  }

  if (corte.cerrado) {
    const diferencia = (corte.montoContado ?? 0) - corte.montoEsperado;
    const colorDiferencia =
      diferencia === 0
        ? "text-neutral-700 dark:text-neutral-300"
        : diferencia > 0
          ? "text-blue-600 dark:text-blue-400"
          : "text-red-600 dark:text-red-400";

    return (
      <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Corte cerrado{corte.cerradoPor && ` por ${corte.cerradoPor}`}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-500">Contado</p>
            <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              {formatearMonto(corte.montoContado ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Diferencia</p>
            <p className={`text-lg font-semibold ${colorDiferencia}`}>
              {diferencia === 0 ? "Exacto" : formatearMonto(diferencia)}
            </p>
          </div>
        </div>

        {corte.montoContadoTransferencia !== null && (
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <div>
              <p className="text-xs text-neutral-500">Saldo del banco</p>
              <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                {formatearMonto(corte.montoContadoTransferencia)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Diferencia transferencias</p>
              <p
                className={`text-lg font-semibold ${
                  corte.montoContadoTransferencia === corte.totalTransferencias
                    ? "text-neutral-700 dark:text-neutral-300"
                    : corte.montoContadoTransferencia > corte.totalTransferencias
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {corte.montoContadoTransferencia === corte.totalTransferencias
                  ? "Exacto"
                  : formatearMonto(corte.montoContadoTransferencia - corte.totalTransferencias)}
              </p>
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {esDueno && (
          <button
            type="button"
            onClick={onReabrir}
            disabled={isPending}
            className="mt-3 rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {isPending ? "Reabriendo..." : "Reabrir corte"}
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={onCerrar}
      className="flex flex-col gap-3 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60"
    >
      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Cerrar corte
      </h2>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Monto contado (lo que hay físicamente en la caja)
        <input
          type="number"
          inputMode="numeric"
          min={0}
          required
          value={montoContado}
          onChange={(e) => setMontoContado(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      {diferenciaPreview !== null && (
        <p
          className={`text-sm ${
            diferenciaPreview === 0
              ? "text-neutral-600 dark:text-neutral-400"
              : diferenciaPreview > 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
          }`}
        >
          Diferencia con lo esperado: {formatearMonto(diferenciaPreview)}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Saldo real de la cuenta de transferencias en el banco (opcional)
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={saldoBanco}
          onChange={(e) => setSaldoBanco(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        <span className="text-xs text-neutral-500">
          Esperado: {formatearMonto(corte.totalTransferencias)}. Si lo cargás, el próximo corte
          arranca con este saldo real; si no, con el esperado.
        </span>
      </label>

      {difBancoPreview !== null && (
        <p
          className={`text-sm ${
            difBancoPreview === 0
              ? "text-neutral-600 dark:text-neutral-400"
              : difBancoPreview > 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
          }`}
        >
          Diferencia en transferencias: {formatearMonto(difBancoPreview)}
        </p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60"
      >
        {isPending ? "Cerrando..." : "Cerrar corte"}
      </button>
    </form>
  );
}
