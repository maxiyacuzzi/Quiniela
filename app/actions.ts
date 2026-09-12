"use server";

import { revalidatePath } from "next/cache";
import { scrapeCabezas } from "@/lib/scraper";
import { ingestarResultados } from "@/lib/ingest";

export async function actualizarAhora() {
  const scrape = await scrapeCabezas();
  const resumen = await ingestarResultados(scrape);
  revalidatePath("/");
  return resumen;
}
