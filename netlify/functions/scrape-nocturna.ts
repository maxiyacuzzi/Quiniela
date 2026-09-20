import { dispararScrape } from "./_shared";

// Nocturna: sorteo 21:00 ART -> dispara 21:10 ART (00:10 UTC del día siguiente)
export const handler = async () => {
  const body = await dispararScrape();
  console.log("scrape-nocturna:", body);
  return { statusCode: 200, body };
};
