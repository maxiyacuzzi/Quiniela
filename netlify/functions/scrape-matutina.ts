import { dispararScrape } from "./_shared";

// Matutina: sorteo 15:00 ART -> dispara 15:10 ART (18:10 UTC)
export const handler = async () => {
  const body = await dispararScrape();
  console.log("scrape-matutina:", body);
  return { statusCode: 200, body };
};
