import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { scrapeCabezas } from "@/lib/scraper";
import { ingestarResultados } from "@/lib/ingest";
import { getFechaHoyArgentina } from "@/lib/fechas";

export const dynamic = "force-dynamic";

// Comparación en tiempo constante: con === se puede ir adivinando el secreto
// midiendo cuánto tarda en fallar.
function iguales(a: string | null, b: string): boolean {
  if (a === null) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function autorizado(req: NextRequest): boolean {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) return false;

  // Trigger manual / node-cron / curl: header custom.
  if (iguales(req.headers.get("x-scrape-secret"), secret)) return true;

  // Vercel Cron (con "Protect Cron Jobs" activado): manda Authorization: Bearer <secret>.
  return iguales(req.headers.get("authorization"), `Bearer ${secret}`);
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const scrape = await scrapeCabezas(getFechaHoyArgentina());
    const resumen = await ingestarResultados(scrape);
    return NextResponse.json({ ok: true, ...resumen });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}

// Vercel Cron dispara GET; lo tratamos igual que el POST manual.
export async function GET(req: NextRequest) {
  return POST(req);
}
