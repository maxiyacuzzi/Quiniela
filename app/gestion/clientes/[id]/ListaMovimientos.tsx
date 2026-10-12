"use client";

import { useMemo, useState } from "react";
import { MovimientoCliente } from "@/lib/clientes";
import { MedioPago, MEDIO_PAGO_LABEL } from "@/lib/medios-pago";
import { getFechaHoyArgentina, inicioDeSemana, inicioDeMes, sumarDias } from "@/lib/fechas";

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearSaldo(saldo: number) {
  const abs = Math.abs(saldo).toLocaleString("es-AR", { minimumFractionDigits: 0 });
  if (saldo > 0) return { texto: `Te debe $${abs}`, clase: "text-red-600 dark:text-red-400" };
  if (saldo < 0) return { texto: `Le debés $${abs}`, clase: "text-green-600 dark:text-green-400" };
  return { texto: "Sin saldo", clase: "text-neutral-500" };
}

type FiltroTipo = "todos" | "sube" | "baja";
type FiltroMedio = "todos" | MedioPago | "sin-medio";
type FiltroFecha = "todas" | "hoy" | "semana" | "mes" | "puntual";

const FILTROS_TIPO: { valor: FiltroTipo; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "sube", label: "Aumentó la deuda" },
  { valor: "baja", label: "Bajó la deuda" },
];

const FILTROS_FECHA: { valor: FiltroFecha; label: string }[] = [
  { valor: "todas", label: "Cualquier fecha" },
  { valor: "hoy", label: "Hoy" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mes" },
  { valor: "puntual", label: "Un día puntual..." },
];

export default function ListaMovimientos({
  saldo,
  movimientos,
}: {
  saldo: number;
  movimientos: MovimientoCliente[];
}) {
  const saldoInfo = formatearSaldo(saldo);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [medio, setMedio] = useState<FiltroMedio>("todos");
  const [fechaFiltro, setFechaFiltro] = useState<FiltroFecha>("todas");
  const [fechaPuntual, setFechaPuntual] = useState(getFechaHoyArgentina());

  const rango = useMemo(() => {
    const hoy = getFechaHoyArgentina();
    if (fechaFiltro === "hoy") return { desde: hoy, hasta: hoy };
    if (fechaFiltro === "semana") return { desde: inicioDeSemana(hoy), hasta: hoy };
    if (fechaFiltro === "mes") return { desde: inicioDeMes(hoy), hasta: hoy };
    if (fechaFiltro === "puntual") return { desde: fechaPuntual, hasta: fechaPuntual };
    return null;
  }, [fechaFiltro, fechaPuntual]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const desdeMs = rango ? new Date(`${rango.desde}T00:00:00-03:00`).getTime() : null;
    const hastaMs = rango ? new Date(`${sumarDias(rango.hasta, 1)}T00:00:00-03:00`).getTime() : null;

    return movimientos.filter((m) => {
      if (tipo === "sube" && !(m.monto > 0)) return false;
      if (tipo === "baja" && !(m.monto < 0)) return false;
      if (medio === "sin-medio" && m.medioPago !== null) return false;
      if (medio !== "todos" && medio !== "sin-medio" && m.medioPago !== medio) return false;
      if (desdeMs !== null && hastaMs !== null) {
        const t = new Date(m.creadoEn).getTime();
        if (t < desdeMs || t >= hastaMs) return false;
      }
      if (q && !m.concepto.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [movimientos, busqueda, tipo, medio, rango]);

  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex items-center justify-between p-4 pb-0">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Movimientos
        </h2>
        <span className={`text-lg font-bold ${saldoInfo.clase}`}>{saldoInfo.texto}</span>
      </div>

      {movimientos.length === 0 ? (
        <p className="p-4 pt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Todavía no hay movimientos.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 p-4 pb-0">
            <input
              type="text"
              placeholder="Buscar por concepto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
            <div className="flex flex-wrap items-center gap-2">
              {FILTROS_TIPO.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  onClick={() => setTipo(f.valor)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    tipo === f.valor
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <select
                value={medio}
                onChange={(e) => setMedio(e.target.value as FiltroMedio)}
                data-campo="movimientos-medio"
                className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              >
                <option value="todos">Cualquier medio</option>
                <option value="efectivo">{MEDIO_PAGO_LABEL.efectivo}</option>
                <option value="transferencia">{MEDIO_PAGO_LABEL.transferencia}</option>
                <option value="sin-medio">Sin medio (fiado / pendiente)</option>
              </select>

              <select
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value as FiltroFecha)}
                data-campo="movimientos-fecha"
                className="ml-auto rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              >
                {FILTROS_FECHA.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.label}
                  </option>
                ))}
              </select>
              {fechaFiltro === "puntual" && (
                <input
                  type="date"
                  value={fechaPuntual}
                  max={getFechaHoyArgentina()}
                  onChange={(e) => setFechaPuntual(e.target.value)}
                  data-campo="movimientos-fecha-puntual"
                  className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                />
              )}
            </div>
          </div>

          {filtrados.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No hay movimientos que cumplan con ese filtro.</p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
              {filtrados.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm text-neutral-800 dark:text-neutral-200">{m.concepto}</p>
                    <p className="text-xs text-neutral-500">
                      {formatearFechaHora(m.creadoEn)}
                      {m.creadoPor && ` — cargado por ${m.creadoPor}`}
                      {m.medioPago && ` — ${MEDIO_PAGO_LABEL[m.medioPago]}`}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      m.monto > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {m.monto > 0 ? "+" : "-"}${Math.abs(m.monto).toLocaleString("es-AR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
