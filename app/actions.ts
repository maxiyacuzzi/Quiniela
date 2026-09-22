"use server";

import { revalidatePath } from "next/cache";
import { scrapeCabezas } from "@/lib/scraper";
import { ingestarResultados } from "@/lib/ingest";
import { getFechaHoyArgentina } from "@/lib/fechas";

export async function actualizarAhora() {
  const fecha = getFechaHoyArgentina();
  const scrape = await scrapeCabezas(fecha);
  const resumen = await ingestarResultados(scrape);
  revalidatePath("/ultimo-sorteo");
  revalidatePath("/sorteos");
  return resumen;
}
