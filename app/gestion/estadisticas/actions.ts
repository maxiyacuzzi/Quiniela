"use server";

import { requerirPerfil } from "@/lib/perfil";
import { getFechaHoyArgentina } from "@/lib/fechas";
import {
  RangoEstadisticas,
  resolverRango,
  getEstadisticasVentas,
  getEstadisticasCaja,
  getEstadisticasPremios,
  getEstadisticasClientes,
  EstadisticasVentas,
  EstadisticasCaja,
  EstadisticasPremios,
  EstadisticasClientes,
} from "@/lib/estadisticas-gestion";

export interface Estadisticas {
  desde: string;
  hasta: string;
  ventas: EstadisticasVentas;
  caja: EstadisticasCaja;
  premios: EstadisticasPremios;
  clientes: EstadisticasClientes;
}

// Solo el dueño ve estadísticas de gestión (ventas, caja, premios, deuda de
// clientes) — es información sensible del negocio, no apta para empleados.
export async function obtenerEstadisticasAction(rango: RangoEstadisticas): Promise<Estadisticas> {
  await requerirPerfil(["dueno"]);
  const { desde, hasta } = resolverRango(rango, getFechaHoyArgentina());

  const [ventas, caja, premios, clientes] = await Promise.all([
    getEstadisticasVentas(desde, hasta),
    getEstadisticasCaja(desde, hasta),
    getEstadisticasPremios(desde, hasta),
    getEstadisticasClientes(desde, hasta),
  ]);

  return { desde, hasta, ventas, caja, premios, clientes };
}
