"use server";

import { revalidatePath } from "next/cache";
import { scrapeCabezas } from "@/lib/scraper";
import { ingestarResultados } from "@/lib/ingest";
import { getFechaHoyArgentina } from "@/lib/fechas";
import { requerirCupo } from "@/lib/limite-uso";

export async function actualizarAhora() {
  // El botón es público y cada click scrapea la fuente externa y escribe en
  // la base: sin tope, alguien podría hacernos bloquear por la fuente. Los
  // crons ya actualizan solos; esto es solo para forzarlo si viene atrasado.
  await requerirCupo(
    "actualizar",
    { max: 3, ventanaSeg: 5 * 60 },
    { max: 6, ventanaSeg: 60 },
    "Se actualizó hace instantes. Esperá un minuto y probá de nuevo."
  );

  const fecha = getFechaHoyArgentina();
  const scrape = await scrapeCabezas(fecha);
  const resumen = await ingestarResultados(scrape);
  revalidatePath("/ultimo-sorteo");
  revalidatePath("/sorteos");
  return resumen;
}
