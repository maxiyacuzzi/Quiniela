import type { Metadata } from "next";
import { getResultadosRecientes } from "@/lib/queries";
import { getFechaHoyArgentina } from "@/lib/fechas";
import PantallaClient from "./PantallaClient";

export const metadata: Metadata = {
  title: "Pantalla",
  description: "Resultados de quiniela en vivo para la pantalla del local.",
};

export const dynamic = "force-dynamic";

export default async function Pantalla() {
  const hoy = getFechaHoyArgentina();
  const { fecha, filas, esFechaPedida } = await getResultadosRecientes(hoy);

  return (
    <PantallaClient fechaInicial={fecha} filasIniciales={filas} esHoyInicial={esFechaPedida} />
  );
}
