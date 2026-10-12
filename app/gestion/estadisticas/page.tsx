import { requerirPerfil } from "@/lib/perfil";
import { obtenerEstadisticasAction } from "./actions";
import EstadisticasClient from "./EstadisticasClient";

export const dynamic = "force-dynamic";

export default async function Estadisticas() {
  await requerirPerfil(["dueno"]);
  const inicial = await obtenerEstadisticasAction("mes");

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Ventas, caja, premios y deuda de clientes — solo vos lo ves.
        </p>
      </header>

      <EstadisticasClient rangoInicial="mes" datosIniciales={inicial} />
    </main>
  );
}
