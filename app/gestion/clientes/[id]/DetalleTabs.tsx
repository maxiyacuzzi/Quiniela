"use client";

import { useState } from "react";
import { ActividadCliente } from "@/lib/actividad-clientes";
import { MovimientoCliente } from "@/lib/clientes";
import ActividadLista from "../../jugadas/ActividadLista";
import ListaMovimientos from "./ListaMovimientos";

type Pestana = "actividad" | "movimientos";

export default function DetalleTabs({
  actividadInicial,
  cargarActividad,
  saldo,
  movimientos,
}: {
  actividadInicial: ActividadCliente[];
  cargarActividad: (opciones: { desde?: string; hasta?: string }) => Promise<ActividadCliente[]>;
  saldo: number;
  movimientos: MovimientoCliente[];
}) {
  const [pestana, setPestana] = useState<Pestana>("actividad");

  const tab = (valor: Pestana, label: string) => (
    <button
      type="button"
      onClick={() => setPestana(valor)}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        pestana === valor
          ? "bg-red-600 text-white"
          : "border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {tab("actividad", "Jugadas y premios")}
        {tab("movimientos", "Movimientos")}
      </div>

      {pestana === "actividad" ? (
        <ActividadLista
          titulo="Jugadas y premios"
          actividadInicial={actividadInicial}
          cargarActividad={cargarActividad}
          mostrarCliente={false}
        />
      ) : (
        <ListaMovimientos saldo={saldo} movimientos={movimientos} />
      )}
    </div>
  );
}
