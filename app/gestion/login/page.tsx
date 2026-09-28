import LoginForm from "./LoginForm";

export default function Login() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-8 text-neutral-900 dark:text-neutral-100">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Gestión</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          AgenciaKava&apos;s — acceso interno
        </p>
      </div>

      <LoginForm />
    </main>
  );
}
