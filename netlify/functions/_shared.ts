export async function dispararScrape(): Promise<string> {
  const base = process.env.URL;
  const secret = process.env.SCRAPE_SECRET;

  if (!base || !secret) {
    throw new Error("Faltan las env vars URL o SCRAPE_SECRET");
  }

  const res = await fetch(`${base}/api/scrape`, {
    method: "POST",
    headers: { "x-scrape-secret": secret },
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`scrape falló (${res.status}): ${body}`);
  }
  return body;
}
