import { getSupabaseAdmin } from "./supabase";
import { MedioPago } from "./medios-pago";

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
  medioPago: MedioPago | null; // solo tiene sentido cuando liquidado=true
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
  jugada_id: string | null;
  fecha_sorteo: string | null;
  creado_en: string;
  clientes: { nombre: string } | null;
  perfiles: { nombre: string } | null;
}

function jugadaAActividad(j: FilaJugada, jugadasConPremio: Set<string>): ActividadCliente {
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
    tienePremio: jugadasConPremio.has(j.id),
    fechaSorteo: j.fecha,
    creadoPor: j.perfiles?.nombre ?? null,
    creadoEn: j.creado_en,
  };
}

function premioAActividad(p: FilaPremio): ActividadCliente {
  return {
    id: p.id,
    tipo: "premio",
    clienteId: p.cliente_id,
    clienteNombre: p.clientes?.nombre ?? "?",
    juego: p.juego as Juego,
    descripcion: p.descripcion,
    monto: Number(p.monto),
    liquidado: p.pagado,
    medioPago: p.medio_pago as MedioPago | null,
    tienePremio: false,
    fechaSorteo: p.fecha_sorteo,
    creadoPor: p.perfiles?.nombre ?? null,
    creadoEn: p.creado_en,
  };
}

const SELECT_JUGADA =
  "id, cliente_id, juego, descripcion, importe, fiado, medio_pago, fecha, creado_en, clientes(nombre), perfiles(nombre)";
const SELECT_PREMIO =
  "id, cliente_id, juego, descripcion, monto, pagado, medio_pago, jugada_id, fecha_sorteo, creado_en, clientes(nombre), perfiles(nombre)";

function combinarYOrdenar(
  jugadas: FilaJugada[],
  premios: FilaPremio[],
  limite: number
): ActividadCliente[] {
  const jugadasConPremio = new Set(
    premios.map((p) => p.jugada_id).filter((id): id is string => id !== null)
  );

  const actividad: ActividadCliente[] = [
    ...jugadas.map((j) => jugadaAActividad(j, jugadasConPremio)),
    ...premios.map(premioAActividad),
  ];

  actividad.sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
  return actividad.slice(0, limite);
}

export async function listarActividadReciente(limite = 30): Promise<ActividadCliente[]> {
  const supabase = getSupabaseAdmin();

  const [jugadasRes, premiosRes] = await Promise.all([
    supabase
      .from("jugadas_clientes")
      .select(SELECT_JUGADA)
      .order("creado_en", { ascending: false })
      .limit(limite),
    supabase
      .from("premios_clientes")
      .select(SELECT_PREMIO)
      .order("creado_en", { ascending: false })
      .limit(limite),
  ]);

  if (jugadasRes.error) throw new Error(`Error al leer jugadas: ${jugadasRes.error.message}`);
  if (premiosRes.error) throw new Error(`Error al leer premios: ${premiosRes.error.message}`);

  return combinarYOrdenar(
    jugadasRes.data as unknown as FilaJugada[],
    premiosRes.data as unknown as FilaPremio[],
    limite
  );
}

export async function listarActividadPorCliente(
  clienteId: string,
  limite = 20
): Promise<ActividadCliente[]> {
  const supabase = getSupabaseAdmin();

  const [jugadasRes, premiosRes] = await Promise.all([
    supabase
      .from("jugadas_clientes")
      .select(SELECT_JUGADA)
      .eq("cliente_id", clienteId)
      .order("creado_en", { ascending: false })
      .limit(limite),
    supabase
      .from("premios_clientes")
      .select(SELECT_PREMIO)
      .eq("cliente_id", clienteId)
      .order("creado_en", { ascending: false })
      .limit(limite),
  ]);

  if (jugadasRes.error) throw new Error(`Error al leer jugadas: ${jugadasRes.error.message}`);
  if (premiosRes.error) throw new Error(`Error al leer premios: ${premiosRes.error.message}`);

  return combinarYOrdenar(
    jugadasRes.data as unknown as FilaJugada[],
    premiosRes.data as unknown as FilaPremio[],
    limite
  );
}
