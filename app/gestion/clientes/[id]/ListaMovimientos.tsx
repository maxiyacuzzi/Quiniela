import { MovimientoCliente } from "@/lib/clientes";
import { MEDIO_PAGO_LABEL } from "@/lib/medios-pago";

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

export default function ListaMovimientos({
  saldo,
  movimientos,
}: {
  saldo: number;
  movimientos: MovimientoCliente[];
}) {
  const saldoInfo = formatearSaldo(saldo);

  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Movimientos
        </h2>
        <span className={`text-lg font-bold ${saldoInfo.clase}`}>{saldoInfo.texto}</span>
      </div>

      {movimientos.length === 0 ? (
        <p className="p-4 pt-0 text-sm text-neutral-600 dark:text-neutral-400">
          Todavía no hay movimientos.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {movimientos.map((m) => (
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
    </div>
  );
}
