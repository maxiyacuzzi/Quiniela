import { getResultadosPorFecha } from "@/lib/queries";
import { getFechaHoyArgentina } from "@/lib/fechas";
import PantallaClient from "./PantallaClient";

export const dynamic = "force-dynamic";

export default async function Pantalla() {
  const fecha = getFechaHoyArgentina();
  const filas = await getResultadosPorFecha(fecha);

  return <PantallaClient fechaInicial={fecha} filasIniciales={filas} />;
}
