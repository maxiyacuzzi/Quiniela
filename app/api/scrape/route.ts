import { NextRequest, NextResponse } from "next/server";
import { scrapeCabezas } from "@/lib/scraper";
import { ingestarResultados } from "@/lib/ingest";

export const dynamic = "force-dynamic";

function autorizado(req: NextRequest): boolean {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) return false;

  // Trigger manual / node-cron / curl: header custom.
  if (req.headers.get("x-scrape-secret") === secret) return true;

  // Vercel Cron (con "Protect Cron Jobs" activado): manda Authorization: Bearer <secret>.
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const scrape = await scrapeCabezas();
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
