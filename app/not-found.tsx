import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-red-600">404</p>
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Puede que el link esté mal escrito o que la página ya no exista.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-500"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
