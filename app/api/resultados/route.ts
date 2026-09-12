import { NextRequest, NextResponse } from "next/server";
import { getResultadosPorFecha } from "@/lib/queries";
import { getFechaHoyArgentina, esFechaValida } from "@/lib/fechas";

export const dynamic = "force-dynamic";

// Solo lectura (no dispara scraping): la pantalla lo usa para refrescarse
// solo mientras el día avanza, sin pegarle a la fuente externa.
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("fecha");
  const fecha = param && esFechaValida(param) ? param : getFechaHoyArgentina();

  const filas = await getResultadosPorFecha(fecha);
  return NextResponse.json({ fecha, filas });
}
