"use client";

import { useRouter } from "next/navigation";

export default function SelectorFecha({
  fecha,
  max,
}: {
  fecha: string;
  max: string;
}) {
  const router = useRouter();

  return (
    <input
      type="date"
      value={fecha}
      max={max}
      onChange={(e) => {
        if (e.target.value) router.push(`/?fecha=${e.target.value}`);
      }}
      className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
    />
  );
}
