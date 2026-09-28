import { getSupabaseAdmin } from "./supabase";
import { MedioPago } from "./medios-pago";

export interface ClienteConSaldo {
  id: string;
  nombre: string;
  sobrenombre: string | null;
  telefono: string | null;
  activo: boolean;
  saldo: number;
}

export interface MovimientoCliente {
  id: string;
  monto: number;
  concepto: string;
  medioPago: MedioPago | null;
  creadoEn: string;
  creadoPor: string | null; // nombre de quien lo cargó, o null si no se sabe
}

export interface ClienteDetalle {
  id: string;
  nombre: string;
  sobrenombre: string | null;
  telefono: string | null;
  activo: boolean;
  saldo: number;
  movimientos: MovimientoCliente[];
}

export async function listarClientes(): Promise<ClienteConSaldo[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("clientes_con_saldo")
    .select("id, nombre, sobrenombre, telefono, activo, saldo")
    .order("nombre");

  if (error) throw new Error(`Error al leer los clientes: ${error.message}`);

  return (data ?? []).map((c) => ({ ...c, saldo: Number(c.saldo) }));
}

export async function getClienteDetalle(id: string): Promise<ClienteDetalle | null> {
  const supabase = getSupabaseAdmin();

  const { data: cliente, error } = await supabase
    .from("clientes_con_saldo")
    .select("id, nombre, sobrenombre, telefono, activo, saldo")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Error al leer el cliente: ${error.message}`);
  if (!cliente) return null;

  const { data: movimientos, error: errorMov } = await supabase
    .from("movimientos_cliente")
    .select("id, monto, concepto, medio_pago, creado_en, perfiles(nombre)")
    .eq("cliente_id", id)
    .order("creado_en", { ascending: false });

  if (errorMov) throw new Error(`Error al leer los movimientos: ${errorMov.message}`);

  return {
    ...cliente,
    saldo: Number(cliente.saldo),
    movimientos: (movimientos ?? []).map((m) => ({
      id: m.id,
      monto: Number(m.monto),
      concepto: m.concepto,
      medioPago: m.medio_pago as MedioPago | null,
      creadoEn: m.creado_en,
      creadoPor: (m.perfiles as unknown as { nombre: string } | null)?.nombre ?? null,
    })),
  };
}
