"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Fuera de /pantalla (la TV del local, ocupa toda la pantalla) y de
// /gestion (uso interno), todas las páginas linkean a los textos legales.
export default function PiePagina() {
  const pathname = usePathname();
  if (pathname.startsWith("/pantalla") || pathname.startsWith("/gestion")) return null;

  return (
    <footer className="border-t border-neutral-200 px-4 py-4 text-center text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/privacidad" className="underline-offset-2 hover:underline">
          Política de privacidad
        </Link>
        <Link href="/terminos" className="underline-offset-2 hover:underline">
          Términos y condiciones
        </Link>
      </nav>
      <p className="mt-2">
        Los resultados son informativos. El único resultado válido es el extracto oficial de cada lotería.
      </p>
    </footer>
  );
}
