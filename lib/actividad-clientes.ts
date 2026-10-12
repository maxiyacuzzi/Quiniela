import { getSupabaseAdmin } from "./supabase";
import { sumarDias } from "./fechas";
import { MedioPago, MedioPagoPremio } from "./medios-pago";

export type Juego = "quiniela" | "quini6" | "loto" | "brinco";

export const JUEGOS: Juego[] = ["quiniela", "quini6", "loto", "brinco"];

export const JUEGO_LABEL: Record<Juego, string> = {
  quiniela: "Quiniela",
  quini6: "Quini 6",
  loto: "Loto",
  brinco: "Brinco",
};

export interface ActividadCliente {
  id: string;
  tipo: "jugada" | "premio";
  clienteId: string;
  clienteNombre: string;
  juego: Juego;
  descripcion: string;
  monto: number; // importe (jugada) o monto (premio)
  liquidado: boolean; // jugada: ya pagada (no fiada). premio: ya pagado.
  medioPago: MedioPagoPremio | null; // solo tiene sentido cuando liquidado=true. "cuenta"/"mixto" solo en premios.
  montoEfectivo: number | null; // solo cuando medioPago === "mixto"
  montoTransferencia: number | null; // solo cuando medioPago === "mixto"
  montoCuenta: number | null; // solo cuando medioPago === "mixto" (si es "cuenta" a secas, es el monto entero)
  clienteSaldo: number; // saldo actual del cliente (positivo: debe). Sirve para avisar antes de pagarle un premio.
  tienePremio: boolean; // solo en jugadas: ya tiene un premio registrado
  fechaSorteo: string | null; // para qué sorteo es (liquidación); null en lo cargado antes de existir
  creadoPor: string | null;
  creadoEn: string;
}

interface FilaJugada {
  id: string;
  cliente_id: string;
  juego: string;
  descripcion: string;
  importe: number;
  fiado: boolean;
  medio_pago: string | null;
  fecha: string | null;
  creado_en: string;
  clientes: { nombre: string } | null;
  perfiles: { nombre: string } | null;
}

interface FilaPremio {
  id: string;
  cliente_id: string;
  juego: string;
  descripcion: string;
  monto: number;
  pagado: boolean;
  medio_pago: string | null;
  monto_efectivo: number | null;
  monto_transferencia: number | null;
  monto_cuenta: number | null;
  jugada_id: string | null;
  fecha_sorteo: string | null;
  creado_en: string;
  clientes: { nombre: string } | null;
  perfiles: { nombre: string } | null;
}

function jugadaAActividad(
  j: FilaJugada,
  jugadasConPremio: Set<string>,
  saldos: Map<string, number>
): ActividadCliente {
  return {
    id: j.id,
    tipo: "jugada",
    clienteId: j.cliente_id,
    clienteNombre: j.clientes?.nombre ?? "?",
    juego: j.juego as Juego,
    descripcion: j.descripcion,
    monto: Number(j.importe),
    liquidado: !j.fiado,
    medioPago: j.medio_pago as MedioPago | null,
    montoEfectivo: null,
    montoTransferencia: null,
    montoCuenta: null,
    clienteSaldo: saldos.get(j.cliente_id) ?? 0,
    tienePremio: jugadasConPremio.has(j.id),
    fechaSorteo: j.fecha,
    creadoPor: j.perfiles?.nombre ?? null,
    creadoEn: j.creado_en,
  };
}

function premioAActividad(p: FilaPremio, saldos: Map<string, number>): ActividadCliente {
  return {
    id: p.id,
    tipo: "premio",
    clienteId: p.cliente_id,
    clienteNombre: p.clientes?.nombre ?? "?",
    juego: p.juego as Juego,
    descripcion: p.descripcion,
    monto: Number(p.monto),
    liquidado: p.pagado,
    medioPago: p.medio_pago as MedioPagoPremio | null,
    montoEfectivo: p.monto_efectivo === null ? null : Number(p.monto_efectivo),
    montoTransferencia: p.monto_transferencia === null ? null : Number(p.monto_transferencia),
    montoCuenta: p.monto_cuenta === null ? null : Number(p.monto_cuenta),
    clienteSaldo: saldos.get(p.cliente_id) ?? 0,
    tienePremio: false,
    fechaSorteo: p.fecha_sorteo,
    creadoPor: p.perfiles?.nombre ?? null,
    creadoEn: p.creado_en,
  };
}

const SELECT_JUGADA =
  "id, cliente_id, juego, descripcion, importe, fiado, medio_pago, fecha, creado_en, clientes(nombre), perfiles(nombre)";
const SELECT_PREMIO =
  "id, cliente_id, juego, descripcion, monto, pagado, medio_pago, monto_efectivo, monto_transferencia, monto_cuenta, jugada_id, fecha_sorteo, creado_en, clientes(nombre), perfiles(nombre)";

// El saldo de cada cliente involucrado, para poder avisar "te debe $X" antes
// de pagarle un premio (ver RegistrarPremioJugada / CargarPremioForm).
async function getSaldosPorCliente(clienteIds: string[]): Promise<Map<string, number>> {
  if (clienteIds.length === 0) return new Map();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("clientes_con_saldo")
    .select("id, saldo")
    .in("id", [...new Set(clienteIds)]);
  if (error) throw new Error(`Error al leer el saldo de los clientes: ${error.message}`);
  return new Map((data ?? []).map((c) => [c.id, Number(c.saldo)]));
}

async function combinarYOrdenar(
  jugadas: FilaJugada[],
  premios: FilaPremio[],
  limite: number
): Promise<ActividadCliente[]> {
  const jugadasConPremio = new Set(
    premios.map((p) => p.jugada_id).filter((id): id is string => id !== null)
  );
  const saldos = await getSaldosPorCliente([
    ...jugadas.map((j) => j.cliente_id),
    ...premios.map((p) => p.cliente_id),
  ]);

  const actividad: ActividadCliente[] = [
    ...jugadas.map((j) => jugadaAActividad(j, jugadasConPremio, saldos)),
    ...premios.map((p) => premioAActividad(p, saldos)),
  ];

  actividad.sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
  return actividad.slice(0, limite);
}

export interface OpcionesActividad {
  limite?: number;
  desde?: string; // fecha "YYYY-MM-DD", inclusive — filtra por cuándo se cargó (creado_en)
  hasta?: string; // fecha "YYYY-MM-DD", inclusive
}

// Sin filtro de fecha se trae lo último (30/20) para un vistazo rápido. Con
// filtro de fecha (día/semana/mes) importa traer TODO ese período, no solo
// lo que entre en ese tope — por eso el límite sube bastante.
const LIMITE_SIN_FECHA = 30;
const LIMITE_CON_FECHA = 1000;

function ventanaFecha(desde?: string, hasta?: string): { desde: string; hasta: string } | null {
  if (!desde && !hasta) return null;
  const d = desde ?? hasta!;
  const h = hasta ?? desde!;
  return { desde: `${d}T00:00:00-03:00`, hasta: `${sumarDias(h, 1)}T00:00:00-03:00` };
}

export async function listarActividadReciente(
  opciones: OpcionesActividad = {}
): Promise<ActividadCliente[]> {
  const supabase = getSupabaseAdmin();
  const ventana = ventanaFecha(opciones.desde, opciones.hasta);
  const limite = opciones.limite ?? (ventana ? LIMITE_CON_FECHA : LIMITE_SIN_FECHA);

  let jugadasQuery = supabase
    .from("jugadas_clientes")
    .select(SELECT_JUGADA)
    .order("creado_en", { ascending: false })
    .limit(limite);
  let premiosQuery = supabase
    .from("premios_clientes")
    .select(SELECT_PREMIO)
    .order("creado_en", { ascending: false })
    .limit(limite);
  if (ventana) {
    jugadasQuery = jugadasQuery.gte("creado_en", ventana.desde).lt("creado_en", ventana.hasta);
    premiosQuery = premiosQuery.gte("creado_en", ventana.desde).lt("creado_en", ventana.hasta);
  }

  const [jugadasRes, premiosRes] = await Promise.all([jugadasQuery, premiosQuery]);

  if (jugadasRes.error) throw new Error(`Error al leer jugadas: ${jugadasRes.error.message}`);
  if (premiosRes.error) throw new Error(`Error al leer premios: ${premiosRes.error.message}`);

  return await combinarYOrdenar(
    jugadasRes.data as unknown as FilaJugada[],
    premiosRes.data as unknown as FilaPremio[],
    limite
  );
}

export async function listarActividadPorCliente(
  clienteId: string,
  opciones: OpcionesActividad = {}
): Promise<ActividadCliente[]> {
  const supabase = getSupabaseAdmin();
  const ventana = ventanaFecha(opciones.desde, opciones.hasta);
  const limite = opciones.limite ?? (ventana ? LIMITE_CON_FECHA : 20);

  let jugadasQuery = supabase
    .from("jugadas_clientes")
    .select(SELECT_JUGADA)
    .eq("cliente_id", clienteId)
    .order("creado_en", { ascending: false })
    .limit(limite);
  let premiosQuery = supabase
    .from("premios_clientes")
    .select(SELECT_PREMIO)
    .eq("cliente_id", clienteId)
    .order("creado_en", { ascending: false })
    .limit(limite);
  if (ventana) {
    jugadasQuery = jugadasQuery.gte("creado_en", ventana.desde).lt("creado_en", ventana.hasta);
    premiosQuery = premiosQuery.gte("creado_en", ventana.desde).lt("creado_en", ventana.hasta);
  }

  const [jugadasRes, premiosRes] = await Promise.all([jugadasQuery, premiosQuery]);

  if (jugadasRes.error) throw new Error(`Error al leer jugadas: ${jugadasRes.error.message}`);
  if (premiosRes.error) throw new Error(`Error al leer premios: ${premiosRes.error.message}`);

  return await combinarYOrdenar(
    jugadasRes.data as unknown as FilaJugada[],
    premiosRes.data as unknown as FilaPremio[],
    limite
  );
}
