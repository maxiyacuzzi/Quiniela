import Link from "next/link";
import { requerirPerfil } from "@/lib/perfil";
import { getFechaHoyArgentina } from "@/lib/fechas";
import { obtenerCorte, getUltimoMontoInicialEfectivo, turnoCajaActual } from "@/lib/caja";
import { getCuentaPremios } from "@/lib/cuenta-premios";
import { getLiquidacionDia, fechaLiquidacionPorDefecto } from "@/lib/liquidacion";
import { listarClientes } from "@/lib/clientes";
import CajaClient from "./CajaClient";
import CuentaPremiosPanel from "./CuentaPremiosPanel";
import LiquidacionEstimada from "./LiquidacionEstimada";

export const dynamic = "force-dynamic";

export default async function Caja() {
  const perfil = await requerirPerfil();
  const hoy = getFechaHoyArgentina();

  const esDueno = perfil.rol === "dueno";

  // La liquidación con la lotería y la cuenta de premios son solo del dueño: a
  // los empleados ni siquiera se les consulta (y las acciones también lo exigen).
  const [corte, clientes, cuentaPremios, liquidacion, sugerenciaMontoInicial] = await Promise.all([
    obtenerCorte({ fecha: hoy, turno: turnoCajaActual() }),
    listarClientes(),
    esDueno ? getCuentaPremios() : Promise.resolve(null),
    // El memo de la lotería llega "al otro día del sorteo", así que por
    // default mostramos la liquidación de ayer (la del día que ya cerró) —
    // salvo que ayer sea domingo (no hay sorteo), ahí mostramos el sábado,
    // que ya trae juntado el viernes (ver fechaLiquidacionPorDefecto).
    esDueno ? getLiquidacionDia(fechaLiquidacionPorDefecto(hoy)) : Promise.resolve(null),
    getUltimoMontoInicialEfectivo(),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Caja</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/gestion/caja/resumen"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500"
          >
            Resumen por día
          </Link>
        <Link
          href="/gestion"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          ← Volver a Gestión
        </Link>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <CajaClient
          corteInicial={corte}
          esDueno={esDueno}
          clientes={clientes}
          sugerenciaMontoInicial={sugerenciaMontoInicial}
        />
        {liquidacion && <LiquidacionEstimada liquidacionInicial={liquidacion} />}
        {cuentaPremios && <CuentaPremiosPanel cuenta={cuentaPremios} />}
      </div>
    </main>
  );
}
