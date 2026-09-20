import { dispararScrape } from "./_shared";

// Primera: sorteo 12:00 ART -> dispara 12:10 ART (15:10 UTC)
export const handler = async () => {
  const body = await dispararScrape();
  console.log("scrape-primera:", body);
  return { statusCode: 200, body };
};
