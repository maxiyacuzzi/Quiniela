"use client";

import { useRouter } from "next/navigation";

export default function SelectorFecha({
  fechas,
  fechaActual,
}: {
  fechas: string[];
  fechaActual: string;
}) {
  const router = useRouter();

  return (
    <select
      value={fechaActual}
      onChange={(e) => router.push(`/?fecha=${e.target.value}`)}
      className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
    >
      {fechas.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );
}
