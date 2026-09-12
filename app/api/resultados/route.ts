import { NextRequest, NextResponse } from "next/server";
import { getResultadosRecientes } from "@/lib/queries";
import { getFechaHoyArgentina, esFechaValida } from "@/lib/fechas";

export const dynamic = "force-dynamic";

// Solo lectura (no dispara scraping): la pantalla lo usa para refrescarse
// solo mientras el día avanza, sin pegarle a la fuente externa. Si la fecha
// pedida todavía no tiene datos, devuelve el último día anterior que sí tenga.
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("fecha");
  const fechaPedida = param && esFechaValida(param) ? param : getFechaHoyArgentina();

  const { fecha, filas, esFechaPedida } = await getResultadosRecientes(fechaPedida);
  return NextResponse.json({ fecha, filas, esFechaPedida });
}
