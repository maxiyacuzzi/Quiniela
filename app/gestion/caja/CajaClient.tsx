"use client";

import { useState, useTransition } from "react";
import { CorteCaja, TURNO_CAJA_LABEL, corteAnterior, corteSiguiente, esCorteFuturo } from "@/lib/caja";
import { formatearFechaLegible } from "@/lib/fechas";
import { obtenerCorteAction } from "./actions";
import MovimientosCajaForm from "./MovimientosCajaForm";
import CobroDeudaForm from "./CobroDeudaForm";
import AbrirTurnoForm from "./AbrirTurnoForm";
import { ClienteConSaldo } from "@/lib/clientes";
import CerrarCorteForm from "./CerrarCorteForm";

function formatearMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export default function CajaClient({
  corteInicial,
  esDueno,
  clientes,
  sugerenciaMontoInicial,
}: {
  corteInicial: CorteCaja;
  esDueno: boolean;
  clientes: ClienteConSaldo[];
  sugerenciaMontoInicial: number;
}) {
  const [corte, setCorte] = useState(corteInicial);
  const [sugerencia, setSugerencia] = useState(sugerenciaMontoInicial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function irA(id: { fecha: string; turno: typeof corte.turno }) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await obtenerCorteAction(id.fecha, id.turno);
        setCorte(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al buscar el corte");
      }
    });
  }

  function refrescar() {
    irA({ fecha: corte.fecha, turno: corte.turno });
  }

  function alAbrir(nuevo: CorteCaja) {
    setCorte(nuevo);
    setSugerencia(nuevo.saldoInicial);
  }

  const haySiguiente = !esCorteFuturo(corteSiguiente(corte));
  const { referencia, ventasMostrador } = corte;
  const hayReferencia =
    referencia.cantidadJugadasEfectivo > 0 ||
    referencia.cantidadJugadasTransferencia > 0 ||
    referencia.cantidadPremiosEfectivo > 0 ||
    referencia.cantidadPremiosTransferencia > 0 ||
    referencia.cantidadCobrosEfectivo > 0 ||
    referencia.cantidadCobrosTransferencia > 0;
  const hayVentasMostrador =
    ventasMostrador.cantidadEfectivo > 0 || ventasMostrador.cantidadTransferencia > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <button
          type="button"
          onClick={() => irA(corteAnterior(corte))}
          disabled={isPending}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Anterior
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {TURNO_CAJA_LABEL[corte.turno]}
          </p>
          <p className="text-xs text-neutral-500">{formatearFechaLegible(corte.fecha)}</p>
        </div>
        <button
          type="button"
          onClick={() => irA(corteSiguiente(corte))}
          disabled={isPending || !haySiguiente}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Siguiente →
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {isPending && <p className="text-sm text-neutral-500">Buscando...</p>}

      {!isPending && !corte.existe && (
        <AbrirTurnoForm
          fecha={corte.fecha}
          turno={corte.turno}
          esDueno={esDueno}
          sugerenciaMontoInicial={sugerencia}
          montoEsperadoSinFondo={corte.montoEsperado}
          totalTransferencias={corte.totalTransferencias}
          onAbierto={alAbrir}
        />
      )}

      {!isPending && corte.existe && (
        <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Saldo inicial en efectivo (fondo fijo de este turno)
              </p>
              <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                {formatearMonto(corte.saldoInicial)}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Saldo inicial en transferencias (heredado del corte anterior)
              </p>
              <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                {formatearMonto(corte.saldoInicialTransferencia)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isPending && corte.existe && <MovimientosCajaForm corte={corte} onGuardado={refrescar} />}

      {!isPending && (
        <>
          <CobroDeudaForm clientes={clientes} onGuardado={refrescar} />

          {(hayVentasMostrador || corte.turno === "mediodia") && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400">
              <p className="font-medium text-neutral-700 dark:text-neutral-300">
                Ventas de mostrador cobradas en este turno (cargadas en Jugadas, ya sumadas abajo)
              </p>
              {hayVentasMostrador ? (
                <>
                  {ventasMostrador.cantidadEfectivo > 0 && (
                    <p>
                      + {ventasMostrador.cantidadEfectivo} venta
                      {ventasMostrador.cantidadEfectivo === 1 ? "" : "s"} en efectivo:{" "}
                      {formatearMonto(ventasMostrador.efectivo)}
                    </p>
                  )}
                  {ventasMostrador.cantidadTransferencia > 0 && (
                    <p>
                      + {ventasMostrador.cantidadTransferencia} venta
                      {ventasMostrador.cantidadTransferencia === 1 ? "" : "s"} por transferencia:{" "}
                      {formatearMonto(ventasMostrador.transferencia)}
                    </p>
                  )}
                </>
              ) : (
                <p>Todavía no se cobró ninguna en este turno.</p>
              )}
            </div>
          )}

          {hayReferencia && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400">
              <p className="font-medium text-neutral-700 dark:text-neutral-300">
                Jugadas y premios de clientes en este turno (ya sumados/restados abajo)
              </p>
              {referencia.cantidadJugadasEfectivo > 0 && (
                <p>
                  + {referencia.cantidadJugadasEfectivo} jugada
                  {referencia.cantidadJugadasEfectivo === 1 ? "" : "s"} cobradas en efectivo:{" "}
                  {formatearMonto(referencia.jugadasEfectivo)}
                </p>
              )}
              {referencia.cantidadCobrosEfectivo > 0 && (
                <p>
                  + {referencia.cantidadCobrosEfectivo} cobro
                  {referencia.cantidadCobrosEfectivo === 1 ? "" : "s"} de deuda en efectivo:{" "}
                  {formatearMonto(referencia.cobrosEfectivo)}
                </p>
              )}
              {referencia.cantidadCobrosTransferencia > 0 && (
                <p>
                  + {referencia.cantidadCobrosTransferencia} cobro
                  {referencia.cantidadCobrosTransferencia === 1 ? "" : "s"} de deuda por
                  transferencia: {formatearMonto(referencia.cobrosTransferencia)}
                </p>
              )}
              {referencia.cantidadPremiosEfectivo > 0 && (
                <p>
                  − {referencia.cantidadPremiosEfectivo} premio
                  {referencia.cantidadPremiosEfectivo === 1 ? "" : "s"} pagados en efectivo:{" "}
                  {formatearMonto(referencia.premiosEfectivo)}
                </p>
              )}
              {referencia.cantidadJugadasTransferencia > 0 && (
                <p>
                  + {referencia.cantidadJugadasTransferencia} jugada
                  {referencia.cantidadJugadasTransferencia === 1 ? "" : "s"} cobradas por
                  transferencia: {formatearMonto(referencia.jugadasTransferencia)}
                </p>
              )}
              {referencia.cantidadPremiosTransferencia > 0 && (
                <p>
                  − {referencia.cantidadPremiosTransferencia} premio
                  {referencia.cantidadPremiosTransferencia === 1 ? "" : "s"} pagados por
                  transferencia: {formatearMonto(referencia.premiosTransferencia)}
                </p>
              )}
            </div>
          )}

          {corte.existe && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Total esperado en efectivo
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {formatearMonto(corte.montoEsperado)}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Saldo esperado en transferencias
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {formatearMonto(corte.totalTransferencias)}
                  </p>
                </div>
              </div>

              <CerrarCorteForm corte={corte} esDueno={esDueno} onGuardado={refrescar} />
            </>
          )}
        </>
      )}
    </div>
  );
}
