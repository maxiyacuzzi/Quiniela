import Link from "next/link";
import Image from "next/image";

const BOTONES = [
  { href: "/ultimo-sorteo", label: "Último sorteo" },
  { href: "/sorteos", label: "Sorteos" },
  { href: "/pantalla", label: "Pantalla" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/controlar-premio", label: "Controlar premio" },
  { href: "/crear-jugada", label: "Crear jugada" },
  { href: "/quini6", label: "Quini 6" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <div className="mb-10 flex flex-col items-center gap-4 text-center">
        <div className="rounded-lg bg-white p-2">
          <Image
            src="/kavas-logo-redondo.jpeg"
            alt="AgenciaKava's"
            width={1280}
            height={853}
            className="h-24 w-auto"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AgenciaKava&apos;s</h1>
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {BOTONES.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="rounded-xl border border-neutral-300 bg-neutral-50 px-6 py-4 text-center text-lg font-semibold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {b.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
