import { dispararScrape } from "./_shared";

// Previa: sorteo 10:15 ART -> dispara 10:25 ART (13:25 UTC)
export const handler = async () => {
  const body = await dispararScrape();
  console.log("scrape-previa:", body);
  return { statusCode: 200, body };
};
