"use client";

import { useState } from "react";
import { ClienteConSaldo } from "@/lib/clientes";
import { ActividadCliente } from "@/lib/actividad-clientes";
import ClientePicker from "./ClientePicker";
import CargarJugadaForm from "./CargarJugadaForm";
import CargarPremioForm from "./CargarPremioForm";
import VentaMostradorForm from "./VentaMostradorForm";
import ActividadLista from "./ActividadLista";
import { obtenerActividadRecienteAction } from "./actions";

export default function JugadasClient({
  clientes,
  actividadInicial,
  hoy,
}: {
  clientes: ClienteConSaldo[];
  actividadInicial: ActividadCliente[];
  hoy: string;
}) {
  const [clienteId, setClienteId] = useState<string | null>(null);
  const cliente = clientes.find((c) => c.id === clienteId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <ClientePicker
        clientes={clientes}
        clienteSeleccionado={cliente}
        onSeleccionar={setClienteId}
      />

      {cliente && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CargarJugadaForm clienteId={cliente.id} hoy={hoy} />
          <CargarPremioForm clienteId={cliente.id} saldoCliente={cliente.saldo} hoy={hoy} />
        </div>
      )}

      <VentaMostradorForm hoy={hoy} />

      <ActividadLista
        titulo="Actividad reciente"
        actividadInicial={actividadInicial}
        cargarActividad={obtenerActividadRecienteAction}
      />
    </div>
  );
}
