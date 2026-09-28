import { getSupabaseAdmin } from "./supabase";

export interface MovimientoCuentaPremios {
  id: string;
  fecha: string;
  monto: number; // positivo: depósito. negativo: retiro/pago.
  concepto: string;
  creadoPor: string | null;
  creadoEn: string;
}

export interface CuentaPremios {
  saldo: number; // acumulado real, se arrastra siempre (no se resetea)
  movimientos: MovimientoCuentaPremios[];
}

export async function getCuentaPremios(limite = 20): Promise<CuentaPremios> {
  const supabase = getSupabaseAdmin();

  const [{ data: todos, error: errorTodos }, { data: recientes, error: errorRecientes }] =
    await Promise.all([
      supabase.from("cuenta_premios_movimientos").select("monto"),
      supabase
        .from("cuenta_premios_movimientos")
        .select("id, fecha, monto, concepto, creado_en, perfiles(nombre)")
        .order("creado_en", { ascending: false })
        .limit(limite),
    ]);

  if (errorTodos) throw new Error(`Error al calcular el saldo: ${errorTodos.message}`);
  if (errorRecientes) throw new Error(`Error al leer los movimientos: ${errorRecientes.message}`);

  const saldo = (todos ?? []).reduce((acc, m) => acc + Number(m.monto), 0);

  const movimientos: MovimientoCuentaPremios[] = (recientes ?? []).map((m) => ({
    id: m.id,
    fecha: m.fecha,
    monto: Number(m.monto),
    concepto: m.concepto,
    creadoPor: (m.perfiles as unknown as { nombre: string } | null)?.nombre ?? null,
    creadoEn: m.creado_en,
  }));

  return { saldo, movimientos };
}
