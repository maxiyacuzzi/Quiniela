"use client";

const TODOS = Array.from({ length: 46 }, (_, i) => i.toString().padStart(2, "0"));

export default function SelectorNumeros({
  seleccionados,
  onChange,
  max = 6,
}: {
  seleccionados: string[];
  onChange: (numeros: string[]) => void;
  max?: number;
}) {
  function toggle(n: string) {
    if (seleccionados.includes(n)) {
      onChange(seleccionados.filter((x) => x !== n));
    } else if (seleccionados.length < max) {
      onChange([...seleccionados, n]);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs text-neutral-500">
        {seleccionados.length}/{max} números elegidos
      </p>
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
        {TODOS.map((n) => {
          const elegido = seleccionados.includes(n);
          const deshabilitado = !elegido && seleccionados.length >= max;
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              disabled={deshabilitado}
              className={`rounded-lg border px-2 py-2 text-sm font-mono transition-colors ${
                elegido
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-neutral-300 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
