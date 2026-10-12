"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ActividadCliente, JUEGO_LABEL, JUEGOS, Juego } from "@/lib/actividad-clientes";
import { MEDIO_PAGO_PREMIO_LABEL } from "@/lib/medios-pago";
import {
  formatearFechaLegible,
  getFechaHoyArgentina,
  inicioDeSemana,
  inicioDeMes,
} from "@/lib/fechas";
import RegistrarPremioJugada from "./RegistrarPremioJugada";

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearMonto(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

// "Efectivo" / "Transferencia" para el caso normal; para un premio mixto,
// desglosa cuánto salió de cada cuenta.
function descripcionMedioPago(a: ActividadCliente): string {
  if (a.medioPago === "mixto") {
    const partes = [
      a.montoEfectivo ? `${formatearMonto(a.montoEfectivo)} efectivo` : null,
      a.montoTransferencia ? `${formatearMonto(a.montoTransferencia)} transferencia` : null,
      a.montoCuenta ? `${formatearMonto(a.montoCuenta)} a cuenta` : null,
    ].filter((x): x is string => x !== null);
    return `Mixto (${partes.join(" + ")})`;
  }
  return a.medioPago ? MEDIO_PAGO_PREMIO_LABEL[a.medioPago] : "";
}

type FiltroTipo = "todos" | "jugada" | "premio";
type FiltroEstado = "todos" | "pendiente" | "liquidado";
type FiltroFecha = "todas" | "hoy" | "semana" | "mes" | "puntual";

const FILTROS_TIPO: { valor: FiltroTipo; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "jugada", label: "Jugadas" },
  { valor: "premio", label: "Premios" },
];

const FILTROS_ESTADO: { valor: FiltroEstado; label: string }[] = [
  { valor: "todos", label: "Cualquier estado" },
  { valor: "pendiente", label: "Pendiente (fiado / sin pagar)" },
  { valor: "liquidado", label: "Liquidado" },
];

const FILTROS_FECHA: { valor: FiltroFecha; label: string }[] = [
  { valor: "todas", label: "Cualquier fecha" },
  { valor: "hoy", label: "Hoy" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mes" },
  { valor: "puntual", label: "Un día puntual..." },
];

export default function ActividadLista({
  titulo,
  actividadInicial,
  cargarActividad,
  mostrarCliente = true,
}: {
  titulo: string;
  actividadInicial: ActividadCliente[];
  // Con "todas" se usa lo ya cargado; con cualquier otro filtro de fecha se
  // vuelve a pedir al servidor (ver OpcionesActividad): el vistazo rápido
  // trae lo último nomás, pero filtrar por semana/mes tiene que traer todo
  // ese período.
  cargarActividad: (opciones: { desde?: string; hasta?: string }) => Promise<ActividadCliente[]>;
  mostrarCliente?: boolean;
}) {
  const [actividad, setActividad] = useState(actividadInicial);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [juego, setJuego] = useState<Juego | "todos">("todos");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [fechaFiltro, setFechaFiltro] = useState<FiltroFecha>("todas");
  const [fechaPuntual, setFechaPuntual] = useState(getFechaHoyArgentina());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pedir(opciones: { desde?: string; hasta?: string }) {
    setError(null);
    startTransition(async () => {
      try {
        setActividad(await cargarActividad(opciones));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al buscar la actividad");
      }
    });
  }

  function cambiarFechaFiltro(valor: FiltroFecha) {
    setFechaFiltro(valor);
    const hoy = getFechaHoyArgentina();
    if (valor === "todas") pedir({});
    else if (valor === "hoy") pedir({ desde: hoy, hasta: hoy });
    else if (valor === "semana") pedir({ desde: inicioDeSemana(hoy), hasta: hoy });
    else if (valor === "mes") pedir({ desde: inicioDeMes(hoy), hasta: hoy });
    else if (valor === "puntual") pedir({ desde: fechaPuntual, hasta: fechaPuntual });
  }

  function cambiarFechaPuntual(valor: string) {
    setFechaPuntual(valor);
    if (fechaFiltro === "puntual") pedir({ desde: valor, hasta: valor });
  }

  const filtrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return actividad.filter((a) => {
      if (tipo !== "todos" && a.tipo !== tipo) return false;
      if (juego !== "todos" && a.juego !== juego) return false;
      if (estado === "pendiente" && a.liquidado) return false;
      if (estado === "liquidado" && !a.liquidado) return false;
      if (
        q &&
        !(
          a.clienteNombre.toLowerCase().includes(q) ||
          a.descripcion.toLowerCase().includes(q) ||
          JUEGO_LABEL[a.juego].toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [actividad, busqueda, tipo, juego, estado]);

  if (actividadInicial.length === 0 && fechaFiltro === "todas" && actividad.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
        <h2 className="p-4 pb-0 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {titulo}
        </h2>
        <p className="p-4 pt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Todavía no hay actividad.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
      <h2 className="p-4 pb-0 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        {titulo}
      </h2>

      <div className="flex flex-col gap-2 p-4 pb-0">
        <input
          type="text"
          placeholder={mostrarCliente ? "Buscar por cliente, juego o descripción..." : "Buscar por juego o descripción..."}
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
            value={juego}
            onChange={(e) => setJuego(e.target.value as Juego | "todos")}
            data-campo="actividad-juego"
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            <option value="todos">Todos los juegos</option>
            {JUEGOS.map((j) => (
              <option key={j} value={j}>
                {JUEGO_LABEL[j]}
              </option>
            ))}
          </select>

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as FiltroEstado)}
            data-campo="actividad-estado"
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {FILTROS_ESTADO.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={fechaFiltro}
            onChange={(e) => cambiarFechaFiltro(e.target.value as FiltroFecha)}
            data-campo="actividad-fecha"
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
              onChange={(e) => cambiarFechaPuntual(e.target.value)}
              data-campo="actividad-fecha-puntual"
              className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
          )}
        </div>
      </div>

      {error && <p className="px-4 pt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {isPending ? (
        <p className="p-4 text-sm text-neutral-500">Buscando...</p>
      ) : filtrada.length === 0 ? (
        <p className="p-4 text-sm text-neutral-500">No hay actividad que cumpla con ese filtro.</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
          {filtrada.map((a) => (
            <li key={`${a.tipo}-${a.id}`} className="flex flex-col gap-1 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-neutral-800 dark:text-neutral-200">
                    {mostrarCliente && (
                      <>
                        <Link
                          href={`/gestion/clientes/${a.clienteId}`}
                          className="font-medium hover:underline"
                        >
                          {a.clienteNombre}
                        </Link>
                        {" — "}
                      </>
                    )}
                    {a.tipo === "jugada" ? "Jugada" : "Premio"} ({JUEGO_LABEL[a.juego]}):{" "}
                    {a.descripcion}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatearFechaHora(a.creadoEn)}
                    {a.creadoPor && ` — cargado por ${a.creadoPor}`}
                    {!a.liquidado && (a.tipo === "jugada" ? " — fiado" : " — no pagado")}
                    {a.liquidado && a.medioPago && ` — ${descripcionMedioPago(a)}`}
                    {a.fechaSorteo && ` — sorteo del ${formatearFechaLegible(a.fechaSorteo)}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    a.tipo === "jugada"
                      ? "text-neutral-700 dark:text-neutral-300"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {a.tipo === "premio" && "+"}${a.monto.toLocaleString("es-AR")}
                </span>
              </div>

              {a.tipo === "jugada" &&
                (a.tienePremio ? (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Premio registrado ✓
                  </p>
                ) : (
                  <RegistrarPremioJugada
                    jugadaId={a.id}
                    clienteId={a.clienteId}
                    clienteSaldo={a.clienteSaldo}
                    juego={a.juego}
                  />
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
