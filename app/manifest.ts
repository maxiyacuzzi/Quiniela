import type { MetadataRoute } from "next";
import { NOMBRE_SITIO } from "@/lib/sitio";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOMBRE_SITIO,
    short_name: "Kava's",
    description: "Resultados de quiniela, Quini 6, Loto y Brinco",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#dc2626",
    lang: "es-AR",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
