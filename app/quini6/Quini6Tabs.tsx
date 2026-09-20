"use client";

import { useState } from "react";
import VerSorteos from "./VerSorteos";
import CrearJugadaQuini6 from "./CrearJugadaQuini6";
import ControlarJugadaQuini6 from "./ControlarJugadaQuini6";
import { ObtenerSorteoQuini6Output } from "./ver-sorteos-actions";

type Tab = "ver" | "crear" | "controlar";

const TABS: { id: Tab; label: string }[] = [
  { id: "ver", label: "Ver sorteos" },
  { id: "crear", label: "Crear jugada" },
  { id: "controlar", label: "Controlar jugada" },
];

export default function Quini6Tabs({
  hoy,
  sorteoInicial,
}: {
  hoy: string;
  sorteoInicial: ObtenerSorteoQuini6Output;
}) {
  const [tab, setTab] = useState<Tab>("ver");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 border-b border-neutral-300 dark:border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-red-600 text-red-600 dark:text-red-500"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ver" && <VerSorteos sorteoInicial={sorteoInicial} />}
      {tab === "crear" && <CrearJugadaQuini6 hoy={hoy} />}
      {tab === "controlar" && (
        <ControlarJugadaQuini6 fechas={sorteoInicial.fechas} fechaInicial={sorteoInicial.fecha} />
      )}
    </div>
  );
}
