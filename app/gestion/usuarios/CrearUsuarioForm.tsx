"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rol } from "@/lib/roles";
import { crearUsuarioAction } from "./actions";

export default function CrearUsuarioForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("empleado");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearUsuarioAction({ nombre, email, password, rol });
        setNombre("");
        setEmail("");
        setPassword("");
        setRol("empleado");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear el usuario");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 items-end gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60 sm:grid-cols-2"
    >
      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 sm:col-span-2">
        Crear usuario
      </h2>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Nombre
        <input
          type="text"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Rol
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        >
          <option value="empleado">Empleado</option>
          <option value="dueno">Dueño</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
        Contraseña
        <input
          type="text"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Se la pasás vos al empleado"
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 disabled:opacity-60 sm:col-span-2"
      >
        {isPending ? "Creando..." : "Crear usuario"}
      </button>
    </form>
  );
}
