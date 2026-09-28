import Link from "next/link";
import FilaClickeable from "./FilaClickeable";
import { requerirPerfil } from "@/lib/perfil";
import { getFechaHoyArgentina, formatearFechaLegible } from "@/lib/fechas";
import { getResumenDias, CuentaDia, CuentaPremiosDia } from "@/lib/resumen-caja";

export const dynamic = "force-dynamic";

const OPCIONES_DIAS = [7, 14, 30, 60];

function monto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

const TH = "px-2 py-1.5 text-right text-xs font-medium text-neutral-500 whitespace-nowrap";
const TD = "px-2 py-1.5 text-right text-sm whitespace-nowrap text-neutral-700 dark:text-neutral-300";
const BORDE = "border-l border-neutral-300 dark:border-neutral-700";

function Diferencia({ valor }: { valor: number | null }) {
  if (valor === null) return <td className={TD}>—</td>;
  const color =
    valor === 0
      ? "text-neutral-500"
      : valor > 0
        ? "text-blue-600 dark:text-blue-400"
        : "text-red-600 dark:text-red-400";
  return <td className={`${TD} ${color}`}>{valor === 0 ? "Exacto" : monto(valor)}</td>;
}

function CeldasCuenta({ c }: { c: CuentaDia }) {
  return (
    <>
      <td className={`${TD} ${BORDE}`}>{monto(c.inicial)}</td>
      <td className={`${TD} text-green-700 dark:text-green-400`}>
        {c.entro > 0 ? `+${monto(c.entro)}` : "—"}
      </td>
      <td className={`${TD} text-red-700 dark:text-red-400`}>
        {c.salio > 0 ? `-${monto(c.salio)}` : "—"}
      </td>
      <td className={`${TD} font-semibold text-neutral-900 dark:text-neutral-100`}>
        {monto(c.final)}
      </td>
      <Diferencia valor={c.diferencia} />
    </>
  );
}

function CeldasPremios({ c }: { c: CuentaPremiosDia }) {
  return (
    <>
      <td className={`${TD} ${BORDE}`}>{monto(c.inicial)}</td>
      <td className={`${TD} text-green-700 dark:text-green-400`}>
        {c.depositos > 0 ? `+${monto(c.depositos)}` : "—"}
      </td>
      <td className={`${TD} text-red-700 dark:text-red-400`}>
        {c.pagos > 0 ? `-${monto(c.pagos)}` : "—"}
      </td>
      <td className={`${TD} font-semibold text-neutral-900 dark:text-neutral-100`}>
        {monto(c.final)}
      </td>
    </>
  );
}

export default async function ResumenCaja({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const perfil = await requerirPerfil();
  const esDueno = perfil.rol === "dueno";

  const { dias: diasParam } = await searchParams;
  const dias = OPCIONES_DIAS.includes(Number(diasParam)) ? Number(diasParam) : 14;

  const resumen = await getResumenDias(getFechaHoyArgentina(), dias, esDueno);

  return (
    <main className="mx-auto min-h-screen max-w-[100rem] px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumen por día</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Cómo abrió, qué entró, qué salió y cómo cerró cada cuenta, día por día.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {OPCIONES_DIAS.map((n) => (
            <Link
              key={n}
              href={`/gestion/caja/resumen?dias=${n}`}
              className={`rounded-lg border px-3 py-2 text-sm ${
                n === dias
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-neutral-300 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              }`}
            >
              {n} días
            </Link>
          ))}
          <Link
            href="/gestion/caja"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            ← Volver a Caja
          </Link>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th rowSpan={2} className={`${TH} sticky left-0 bg-neutral-50 text-left dark:bg-neutral-900`}>
                Día
              </th>
              <th rowSpan={2} className={`${TH} ${BORDE} text-center`}>Cortes cerrados</th>
              <th colSpan={5} className={`${TH} ${BORDE} text-center text-neutral-700 dark:text-neutral-300`}>
                Efectivo (caja)
              </th>
              <th colSpan={5} className={`${TH} ${BORDE} text-center text-neutral-700 dark:text-neutral-300`}>
                Transferencias
              </th>
              {esDueno && (
                <>
                  <th colSpan={4} className={`${TH} ${BORDE} text-center text-neutral-700 dark:text-neutral-300`}>
                    Cuenta de premios (Córdoba)
                  </th>
                  <th rowSpan={2} className={`${TH} ${BORDE}`}>Neto lotería (est.)</th>
                </>
              )}
            </tr>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              {["Inicial", "Entró", "Salió", "Final", "Dif."].map((t, i) => (
                <th key={`e${t}`} className={`${TH} ${i === 0 ? BORDE : ""}`}>{t}</th>
              ))}
              {["Inicial", "Entró", "Salió", "Final", "Dif."].map((t, i) => (
                <th key={`t${t}`} className={`${TH} ${i === 0 ? BORDE : ""}`}>{t}</th>
              ))}
              {esDueno &&
                ["Inicial", "Depósitos", "Pagos", "Final"].map((t, i) => (
                  <th key={`p${t}`} className={`${TH} ${i === 0 ? BORDE : ""}`}>{t}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {resumen.map((d) => (
              <FilaClickeable key={d.fecha} href={`/gestion/caja/resumen/${d.fecha}`}>
                <td className={`${TD} sticky left-0 bg-neutral-50 text-left font-medium dark:bg-neutral-900`}>
                  <Link href={`/gestion/caja/resumen/${d.fecha}`}>{formatearFechaLegible(d.fecha)}</Link>
                </td>
                <td className={`${TD} ${BORDE} text-center`}>{d.cortesCerrados}/2</td>
                <CeldasCuenta c={d.efectivo} />
                <CeldasCuenta c={d.transferencias} />
                {esDueno && d.cuentaPremios && <CeldasPremios c={d.cuentaPremios} />}
                {esDueno && (
                  <td
                    className={`${TD} ${BORDE} ${
                      (d.netoLoteria ?? 0) > 0
                        ? "text-red-700 dark:text-red-400"
                        : (d.netoLoteria ?? 0) < 0
                          ? "text-green-700 dark:text-green-400"
                          : ""
                    }`}
                  >
                    {d.netoLoteria === null || d.netoLoteria === 0
                      ? "—"
                      : d.netoLoteria > 0
                        ? `Depositás ${monto(d.netoLoteria)}`
                        : `Te acreditan ${monto(Math.abs(d.netoLoteria))}`}
                  </td>
                )}
              </FilaClickeable>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col gap-1 text-xs text-neutral-500">
        <p>
          <strong>Final</strong> es lo contado si el corte de Cierre ya se cerró, o lo esperado si
          todavía no. <strong>Dif.</strong> suma la diferencia (contado − esperado) de los cortes
          cerrados: en rojo falta, en azul sobra. Inicial + Entró − Salió + Dif. = Final.
        </p>
        <p>
          Hacé click en un día para ver el detalle{esDueno ? " y corregirlo" : ""}. Los días en que nadie abrió la Caja se calculan solos con lo cargado en Jugadas, Ventas y
          Cobros, arrastrando el saldo del día anterior.
        </p>
      </div>
    </main>
  );
}
