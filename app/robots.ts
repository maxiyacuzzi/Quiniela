import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /pantalla es la TV del local: duplica /ultimo-sorteo y no sirve como resultado de búsqueda.
      disallow: ["/gestion", "/api/", "/pantalla"],
    },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
