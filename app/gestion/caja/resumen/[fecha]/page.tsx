import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirPerfil } from "@/lib/perfil";
import { esFechaValida, formatearFechaLegible, restarDias, sumarDias, getFechaHoyArgentina } from "@/lib/fechas";
import { getDetalleDia } from "@/lib/detalle-dia";
import DetalleDiaClient from "./DetalleDiaClient";

export const dynamic = "force-dynamic";

export default async function DetalleDia({ params }: { params: Promise<{ fecha: string }> }) {
  const perfil = await requerirPerfil();
  const { fecha } = await params;
  if (!esFechaValida(fecha)) notFound();

  const detalle = await getDetalleDia(fecha);
  const hoy = getFechaHoyArgentina();
  const enlace =
    "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800";

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{formatearFechaLegible(fecha)}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {perfil.rol === "dueno"
              ? "Detalle del día. Podés corregir cualquier dato: los saldos de los días siguientes se recalculan solos."
              : "Detalle del día (solo lectura)."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/gestion/caja/resumen/${restarDias(fecha, 1)}`} className={enlace}>
            ← Día anterior
          </Link>
          {fecha < hoy && (
            <Link href={`/gestion/caja/resumen/${sumarDias(fecha, 1)}`} className={enlace}>
              Día siguiente →
            </Link>
          )}
          <Link href="/gestion/caja/resumen" className={enlace}>
            Volver al resumen
          </Link>
        </div>
      </header>

      <DetalleDiaClient detalle={detalle} puedeEditar={perfil.rol === "dueno"} />
    </main>
  );
}
