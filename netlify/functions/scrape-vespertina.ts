import { dispararScrape } from "./_shared";

// Vespertina: sorteo 18:00 ART -> dispara 18:10 ART (21:10 UTC)
export const handler = async () => {
  const body = await dispararScrape();
  console.log("scrape-vespertina:", body);
  return { statusCode: 200, body };
};
