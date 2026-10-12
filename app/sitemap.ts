import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

const RUTAS_PUBLICAS = [
  { ruta: "", frecuencia: "hourly" },
  { ruta: "/ultimo-sorteo", frecuencia: "hourly" },
  { ruta: "/sorteos", frecuencia: "hourly" },
  { ruta: "/quini6", frecuencia: "daily" },
  { ruta: "/loto", frecuencia: "daily" },
  { ruta: "/brinco", frecuencia: "daily" },
  { ruta: "/estadisticas", frecuencia: "daily" },
  { ruta: "/controlar-premio", frecuencia: "monthly" },
  { ruta: "/crear-jugada", frecuencia: "monthly" },
  { ruta: "/privacidad", frecuencia: "yearly" },
  { ruta: "/terminos", frecuencia: "yearly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return RUTAS_PUBLICAS.map(({ ruta, frecuencia }) => ({
    url: `${URL_SITIO}${ruta}`,
    changeFrequency: frecuencia,
  }));
}
