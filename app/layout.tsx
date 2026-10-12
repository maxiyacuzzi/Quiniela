import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PiePagina from "./PiePagina";
import { NOMBRE_SITIO, URL_SITIO } from "@/lib/sitio";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPCION = "Resultados de quiniela, Quini 6, Loto y Brinco. Controlá tu premio con una foto del ticket.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: { default: NOMBRE_SITIO, template: `%s · ${NOMBRE_SITIO}` },
  description: DESCRIPCION,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: NOMBRE_SITIO,
    description: DESCRIPCION,
    // TODO: reemplazar por una imagen de 1200×630 pensada para compartir.
    images: [{ url: "/kavas-logo-horizontal.jpeg", width: 815, height: 640, alt: NOMBRE_SITIO }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
        <PiePagina />
      </body>
    </html>
  );
}
