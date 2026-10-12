import Link from "next/link";

// Contenedor común de /privacidad y /terminos.
export default function TextoLegal({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-red-600 hover:underline dark:text-red-400">
        ← Volver al inicio
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{titulo}</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Última actualización: {actualizado}
      </p>
      <div className="mt-6 space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </main>
  );
}
