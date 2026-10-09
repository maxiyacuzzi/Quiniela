import Link from "next/link";
import { ActividadCliente, JUEGO_LABEL } from "@/lib/actividad-clientes";
import { MEDIO_PAGO_PREMIO_LABEL } from "@/lib/medios-pago";
import { formatearFechaLegible } from "@/lib/fechas";
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
    return `Mixto (${formatearMonto(a.montoEfectivo ?? 0)} efectivo + ${formatearMonto(a.montoTransferencia ?? 0)} transferencia)`;
  }
  return a.medioPago ? MEDIO_PAGO_PREMIO_LABEL[a.medioPago] : "";
}

export default function ActividadLista({
  titulo,
  actividad,
  mostrarCliente = true,
}: {
  titulo: string;
  actividad: ActividadCliente[];
  mostrarCliente?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
      <h2 className="p-4 pb-0 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        {titulo}
      </h2>

      {actividad.length === 0 ? (
        <p className="p-4 pt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Todavía no hay actividad.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {actividad.map((a) => (
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
                  <RegistrarPremioJugada jugadaId={a.id} clienteId={a.clienteId} juego={a.juego} />
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
