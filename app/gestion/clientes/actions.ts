"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requerirPerfil } from "@/lib/perfil";
import { MedioPago, MEDIOS_PAGO } from "@/lib/medios-pago";
import {
  ActividadCliente,
  OpcionesActividad,
  listarActividadPorCliente,
} from "@/lib/actividad-clientes";
import { esFechaValida } from "@/lib/fechas";

// Para filtrar "Jugadas y premios" del cliente por día/semana/mes (ver
// obtenerActividadRecienteAction, misma idea para la lista general).
export async function obtenerActividadClienteAction(
  clienteId: string,
  opciones: OpcionesActividad = {}
): Promise<ActividadCliente[]> {
  await requerirPerfil();
  if (opciones.desde !== undefined && !esFechaValida(opciones.desde)) throw new Error("Fecha inválida");
  if (opciones.hasta !== undefined && !esFechaValida(opciones.hasta)) throw new Error("Fecha inválida");
  return listarActividadPorCliente(clienteId, opciones);
}

export interface CrearClienteInput {
  nombre: string;
  sobrenombre: string;
  telefono: string;
}

export async function crearClienteAction(input: CrearClienteInput): Promise<{ id: string }> {
  await requerirPerfil();

  const nombre = input.nombre.trim();
  if (!nombre) throw new Error("Falta el nombre");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nombre,
      sobrenombre: input.sobrenombre.trim() || null,
      telefono: input.telefono.trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Error al crear el cliente: ${error.message}`);
  return { id: data.id };
}

export interface EditarClienteInput {
  id: string;
  nombre: string;
  sobrenombre: string;
  telefono: string;
}

export async function editarClienteAction(input: EditarClienteInput): Promise<void> {
  await requerirPerfil();

  const nombre = input.nombre.trim();
  if (!nombre) throw new Error("Falta el nombre");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("clientes")
    .update({
      nombre,
      sobrenombre: input.sobrenombre.trim() || null,
      telefono: input.telefono.trim() || null,
    })
    .eq("id", input.id);

  if (error) throw new Error(`Error al editar el cliente: ${error.message}`);
}

export async function cambiarActivoClienteAction(id: string, activo: boolean): Promise<void> {
  await requerirPerfil();

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("clientes").update({ activo }).eq("id", id);
  if (error) throw new Error(`Error al actualizar el cliente: ${error.message}`);
}

export interface AgregarMovimientoInput {
  clienteId: string;
  monto: number; // positivo: el cliente me debe. negativo: yo le debo a él.
  concepto: string;
  medioPago: MedioPago;
}

export async function agregarMovimientoAction(input: AgregarMovimientoInput): Promise<void> {
  const perfil = await requerirPerfil();

  if (!Number.isFinite(input.monto) || input.monto === 0) {
    throw new Error("El monto tiene que ser distinto de cero");
  }
  const concepto = input.concepto.trim();
  if (!concepto) throw new Error("Falta el concepto");
  if (!MEDIOS_PAGO.includes(input.medioPago)) throw new Error("Medio de pago inválido");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("movimientos_cliente").insert({
    cliente_id: input.clienteId,
    monto: input.monto,
    concepto,
    medio_pago: input.medioPago,
    creado_por: perfil.id,
  });

  if (error) throw new Error(`Error al agregar el movimiento: ${error.message}`);
}
