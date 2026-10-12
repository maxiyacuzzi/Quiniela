"use client";

import { useState, useTransition } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { RangoEstadisticas, RANGOS } from "@/lib/estadisticas-gestion";
import { JUEGO_LABEL, Juego } from "@/lib/actividad-clientes";
import { formatearFechaLegible } from "@/lib/fechas";
import { obtenerEstadisticasAction, Estadisticas } from "./actions";

// Paleta: mismos roles de color que ya usa el resto de /gestion (verde
// entró/a favor, rojo salió/te debe, ámbar pendiente) + 4 colores fijos para
// los juegos, en el mismo orden siempre (nunca se reasignan si falta uno).
const VERDE = "#16a34a";
const ROJO = "#dc2626";
const AMBAR = "#d97706";
const AZUL = "#2563eb";

function monto(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

function formatearEje(fecha: string) {
  const [, m, d] = fecha.split("-");
  return `${d}/${m}`;
}

function TooltipFecha({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: { name: string; value: number; color?: string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-2 text-xs shadow dark:border-neutral-700 dark:bg-neutral-900">
      <p className="mb-1 font-medium text-neutral-700 dark:text-neutral-300">
        {label && formatearFechaLegible(label)}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {monto(p.value)}
        </p>
      ))}
    </div>
  );
}

function StatTile({ titulo, valor, clase }: { titulo: string; valor: string; clase?: string }) {
  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <p className="text-xs text-neutral-500">{titulo}</p>
      <p className={`text-xl font-bold ${clase ?? "text-neutral-900 dark:text-neutral-100"}`}>{valor}</p>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{titulo}</h2>
      {children}
    </section>
  );
}

export default function EstadisticasClient({
  rangoInicial,
  datosIniciales,
}: {
  rangoInicial: RangoEstadisticas;
  datosIniciales: Estadisticas;
}) {
  const [rango, setRango] = useState(rangoInicial);
  const [datos, setDatos] = useState(datosIniciales);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiarRango(nuevo: RangoEstadisticas) {
    setRango(nuevo);
    setError(null);
    startTransition(async () => {
      try {
        setDatos(await obtenerEstadisticasAction(nuevo));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al buscar las estadísticas");
      }
    });
  }

  const { ventas, caja, premios, clientes } = datos;
  const juegosConVentas = ventas.porJuego.filter((j) => j.ventas > 0 || j.premiosNetos > 0);
  const juegosConPremios = premios.porJuego.filter((j) => j.pagado > 0 || j.pendiente > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {RANGOS.map((r) => (
          <button
            key={r.valor}
            type="button"
            onClick={() => cambiarRango(r.valor)}
            disabled={isPending}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
              rango === r.valor
                ? "border-red-600 bg-red-600 text-white"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {r.label}
          </button>
        ))}
        <span className="text-xs text-neutral-500">
          {formatearFechaLegible(datos.desde)} – {formatearFechaLegible(datos.hasta)}
        </span>
      </div>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className={isPending ? "opacity-50 transition-opacity" : "transition-opacity"}>
        <div className="flex flex-col gap-6">
          {/* ---------- Ventas y liquidación ---------- */}
          <Seccion titulo="Ventas y liquidación estimada">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatTile titulo="Total vendido" valor={monto(ventas.ventasTotal)} />
              <StatTile
                titulo={ventas.netoTotal >= 0 ? "Neto: depositarías" : "Neto: te acreditarían"}
                valor={monto(Math.abs(ventas.netoTotal))}
                clase={ventas.netoTotal >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
              />
            </div>

            {juegosConVentas.length === 0 ? (
              <p className="text-sm text-neutral-500">No hay ventas ni premios en este período.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer>
                  <BarChart data={juegosConVentas}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                    <XAxis dataKey="juego" tickFormatter={(j: Juego) => JUEGO_LABEL[j]} fontSize={12} />
                    <YAxis tickFormatter={(v: number) => monto(v)} width={90} fontSize={11} />
                    <Tooltip content={<TooltipFecha />} labelFormatter={() => ""} />
                    <Legend />
                    <Bar dataKey="ventas" name="Ventas" fill={AZUL} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="premiosNetos" name="Premios (netos)" fill={AMBAR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="h-56 w-full">
              <p className="mb-1 text-xs text-neutral-500">
                Neto estimado por día (arriba de la línea: depositás — abajo: te acreditan)
              </p>
              <ResponsiveContainer>
                <LineChart data={ventas.serieNeto}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                  <XAxis dataKey="fecha" tickFormatter={formatearEje} fontSize={11} minTickGap={24} />
                  <YAxis tickFormatter={(v: number) => monto(v)} width={90} fontSize={11} />
                  <Tooltip content={<TooltipFecha />} />
                  <ReferenceLine y={0} className="stroke-neutral-400 dark:stroke-neutral-600" />
                  <Line type="monotone" dataKey="valor" name="Neto" stroke={AZUL} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Seccion>

          {/* ---------- Caja ---------- */}
          <Seccion titulo="Caja">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Efectivo</h3>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <StatTile titulo="Entró" valor={monto(caja.totalEntroEfectivo)} clase="text-green-600 dark:text-green-400" />
                  <StatTile titulo="Salió" valor={monto(caja.totalSalioEfectivo)} clase="text-red-600 dark:text-red-400" />
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer>
                    <LineChart data={caja.serie}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                      <XAxis dataKey="fecha" tickFormatter={formatearEje} fontSize={10} minTickGap={24} />
                      <YAxis tickFormatter={(v: number) => monto(v)} width={80} fontSize={10} />
                      <Tooltip content={<TooltipFecha />} />
                      <Legend />
                      <Line type="monotone" dataKey="entroEfectivo" name="Entró" stroke={VERDE} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="salioEfectivo" name="Salió" stroke={ROJO} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Transferencias</h3>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <StatTile titulo="Entró" valor={monto(caja.totalEntroTransferencia)} clase="text-green-600 dark:text-green-400" />
                  <StatTile titulo="Salió" valor={monto(caja.totalSalioTransferencia)} clase="text-red-600 dark:text-red-400" />
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer>
                    <LineChart data={caja.serie}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                      <XAxis dataKey="fecha" tickFormatter={formatearEje} fontSize={10} minTickGap={24} />
                      <YAxis tickFormatter={(v: number) => monto(v)} width={80} fontSize={10} />
                      <Tooltip content={<TooltipFecha />} />
                      <Legend />
                      <Line type="monotone" dataKey="entroTransferencia" name="Entró" stroke={VERDE} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="salioTransferencia" name="Salió" stroke={ROJO} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Seccion>

          {/* ---------- Premios pagados ---------- */}
          <Seccion titulo="Premios pagados">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatTile titulo="Pagado" valor={monto(premios.totalPagado)} clase="text-blue-600 dark:text-blue-400" />
              <StatTile titulo="Pendiente de pago" valor={monto(premios.totalPendiente)} clase="text-amber-600 dark:text-amber-400" />
            </div>

            {juegosConPremios.length === 0 ? (
              <p className="text-sm text-neutral-500">No hay premios en este período.</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <BarChart data={juegosConPremios}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                    <XAxis dataKey="juego" tickFormatter={(j: Juego) => JUEGO_LABEL[j]} fontSize={12} />
                    <YAxis tickFormatter={(v: number) => monto(v)} width={90} fontSize={11} />
                    <Tooltip content={<TooltipFecha />} labelFormatter={() => ""} />
                    <Legend />
                    <Bar dataKey="pagado" name="Pagado" fill={AZUL} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="pendiente" name="Pendiente" fill={AMBAR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Seccion>

          {/* ---------- Clientes y deuda ---------- */}
          <Seccion titulo="Clientes y deuda">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile titulo="Te deben (total)" valor={monto(clientes.totalMeDeben)} clase="text-red-600 dark:text-red-400" />
              <StatTile titulo="Les debés (total)" valor={monto(clientes.totalLesDebo)} clase="text-green-600 dark:text-green-400" />
              <StatTile titulo="Clientes activos" valor={String(clientes.cantidadActivos)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Quién más te debe (ahora)
                </h3>
                {clientes.topDeudores.length === 0 ? (
                  <p className="text-sm text-neutral-500">Nadie te debe nada ahora mismo.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {clientes.topDeudores.map((d) => {
                      const max = clientes.topDeudores[0].saldo || 1;
                      return (
                        <li key={d.nombre} className="flex items-center gap-2 text-sm">
                          <span className="w-28 truncate text-neutral-700 dark:text-neutral-300">{d.nombre}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                            <div
                              className="h-full rounded-full bg-red-500"
                              style={{ width: `${Math.max(4, (d.saldo / max) * 100)}%` }}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-right font-medium text-red-600 dark:text-red-400">
                            {monto(d.saldo)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Deuda neta total en el tiempo
                </p>
                <div className="h-48 w-full">
                  <ResponsiveContainer>
                    <LineChart data={clientes.serieDeudaNeta}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                      <XAxis dataKey="fecha" tickFormatter={formatearEje} fontSize={10} minTickGap={24} />
                      <YAxis tickFormatter={(v: number) => monto(v)} width={80} fontSize={10} />
                      <Tooltip content={<TooltipFecha />} />
                      <ReferenceLine y={0} className="stroke-neutral-400 dark:stroke-neutral-600" />
                      <Line type="monotone" dataKey="valor" name="Deuda neta" stroke={AZUL} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1 text-xs text-neutral-500">Arriba de la línea: te deben más de lo que debés.</p>
              </div>
            </div>
          </Seccion>
        </div>
      </div>
    </div>
  );
}
