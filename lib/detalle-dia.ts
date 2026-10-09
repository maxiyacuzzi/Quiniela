import { getSupabaseAdmin } from "./supabase";
import { sumarDias } from "./fechas";
import {
  FilaCorteDB,
  SELECT_FILA_CORTE,
  TurnoCaja,
  calcularCorteLectura,
  corteAnterior,
  getSaldoDeCierre,
  saldoDeCierre,
} from "./caja";
import { MedioPago, MedioPagoPremio } from "./medios-pago";
import { Juego } from "./actividad-clientes";

export interface CorteDetalle {
  turno: TurnoCaja;
  existe: boolean;
  cerrado: boolean;
  saldoInicialEfectivo: number;
  saldoInicialTransferencia: number;
  esperadoEfectivo: number;
  esperadoTransferencia: number;
  contadoEfectivo: number | null;
  contadoTransferencia: number | null;
}

export interface MovimientoCajaDetalle {
  id: string;
  turno: TurnoCaja;
  concepto: string;
  monto: number; // con signo: positivo ingreso, negativo gasto
  medioPago: MedioPago;
  creadoPor: string | null;
}

export interface VentaMostradorDetalle {
  id: string;
  monto: number;
  medioPago: MedioPago;
  fechaSorteo: string;
  creadoEn: string;
}

export interface CobroDeudaDetalle {
  id: string;
  clienteNombre: string;
  monto: number; // positivo
  medioPago: MedioPago;
  creadoEn: string;
}

export interface JugadaDetalle {
  id: string;
  clienteNombre: string;
  juego: Juego;
  importe: number;
  fiado: boolean;
  medioPago: MedioPago | null;
  fechaSorteo: string | null;
  creadoEn: string;
}

export interface PremioDetalle {
  id: string;
  clienteNombre: string;
  juego: Juego;
  monto: number;
  pagado: boolean;
  medioPago: MedioPagoPremio | null;
  montoEfectivo: number | null; // solo cuando medioPago === "mixto"
  montoTransferencia: number | null; // solo cuando medioPago === "mixto"
  fechaSorteo: string | null;
  creadoEn: string;
}

export interface DetalleDia {
  fecha: string;
  cortes: CorteDetalle[];
  movimientosCaja: MovimientoCajaDetalle[];
  ventasMostrador: VentaMostradorDetalle[];
  cobrosDeuda: CobroDeudaDetalle[];
  jugadas: JugadaDetalle[];
  premios: PremioDetalle[];
}

const TURNOS: TurnoCaja[] = ["mediodia", "cierre"];

export async function getDetalleDia(fecha: string): Promise<DetalleDia> {
  const supabase = getSupabaseAdmin();
  const desde = `${fecha}T00:00:00-03:00`;
  const hasta = `${sumarDias(fecha, 1)}T00:00:00-03:00`;

  const [cortesRes, ventasRes, cobrosRes, jugadasRes, premiosRes] = await Promise.all([
    supabase
      .from("cortes_caja")
      .select(
        `${SELECT_FILA_CORTE.replace("movimientos_caja(monto, medio_pago)", "")} movimientos_caja(id, concepto, monto, medio_pago, perfiles(nombre))`
      )
      .eq("fecha", fecha),
    supabase
      .from("ventas_mostrador")
      .select("id, monto, medio_pago, fecha, creado_en")
      .gte("creado_en", desde)
      .lt("creado_en", hasta)
      .order("creado_en"),
    supabase
      .from("movimientos_cliente")
      .select("id, monto, medio_pago, creado_en, clientes(nombre)")
      .eq("cobro_deuda", true)
      .gte("creado_en", desde)
      .lt("creado_en", hasta)
      .order("creado_en"),
    supabase
      .from("jugadas_clientes")
      .select("id, juego, importe, fiado, medio_pago, fecha, creado_en, clientes(nombre)")
      .gte("creado_en", desde)
      .lt("creado_en", hasta)
      .order("creado_en"),
    supabase
      .from("premios_clientes")
      .select(
        "id, juego, monto, pagado, medio_pago, monto_efectivo, monto_transferencia, fecha_sorteo, creado_en, clientes(nombre)"
      )
      .gte("creado_en", desde)
      .lt("creado_en", hasta)
      .order("creado_en"),
  ]);
  for (const r of [cortesRes, ventasRes, cobrosRes, jugadasRes, premiosRes]) {
    if (r.error) throw new Error(`Error al leer el día ${fecha}: ${r.error.message}`);
  }

  type FilaConMovs = Omit<FilaCorteDB, "movimientos_caja"> & {
    movimientos_caja:
      | {
          id: string;
          concepto: string;
          monto: number;
          medio_pago: string;
          perfiles: { nombre: string } | null;
        }[]
      | null;
  };
  const filas = new Map<string, FilaConMovs>();
  for (const f of (cortesRes.data ?? []) as unknown as FilaConMovs[]) filas.set(f.turno, f);

  let saldo = await getSaldoDeCierre(corteAnterior({ fecha, turno: "mediodia" }));
  const cortes: CorteDetalle[] = [];
  for (const turno of TURNOS) {
    const fila = filas.get(turno) ?? null;
    const calc = await calcularCorteLectura(
      { fecha, turno },
      fila as unknown as FilaCorteDB | null,
      saldo
    );
    saldo = saldoDeCierre(calc);
    cortes.push({
      turno,
      existe: fila !== null,
      cerrado: calc.cerrado,
      saldoInicialEfectivo: calc.saldoInicialEfectivo,
      saldoInicialTransferencia: calc.saldoInicialTransferencia,
      esperadoEfectivo: calc.esperadoEfectivo,
      esperadoTransferencia: calc.esperadoTransferencia,
      contadoEfectivo: calc.contadoEfectivo,
      contadoTransferencia: calc.contadoTransferencia,
    });
  }

  const nombre = (c: unknown) => (c as { nombre: string } | null)?.nombre ?? "?";

  return {
    fecha,
    cortes,
    movimientosCaja: TURNOS.flatMap((turno) =>
      (filas.get(turno)?.movimientos_caja ?? []).map((m) => ({
        id: m.id,
        turno,
        concepto: m.concepto,
        monto: Number(m.monto),
        medioPago: m.medio_pago as MedioPago,
        creadoPor: m.perfiles?.nombre ?? null,
      }))
    ),
    ventasMostrador: (ventasRes.data ?? []).map((v) => ({
      id: v.id,
      monto: Number(v.monto),
      medioPago: v.medio_pago as MedioPago,
      fechaSorteo: v.fecha,
      creadoEn: v.creado_en,
    })),
    cobrosDeuda: (cobrosRes.data ?? []).map((c) => ({
      id: c.id,
      clienteNombre: nombre(c.clientes),
      monto: Math.abs(Number(c.monto)),
      medioPago: c.medio_pago as MedioPago,
      creadoEn: c.creado_en,
    })),
    jugadas: (jugadasRes.data ?? []).map((j) => ({
      id: j.id,
      clienteNombre: nombre(j.clientes),
      juego: j.juego as Juego,
      importe: Number(j.importe),
      fiado: j.fiado,
      medioPago: j.medio_pago as MedioPago | null,
      fechaSorteo: j.fecha,
      creadoEn: j.creado_en,
    })),
    premios: (premiosRes.data ?? []).map((p) => ({
      id: p.id,
      clienteNombre: nombre(p.clientes),
      juego: p.juego as Juego,
      monto: Number(p.monto),
      pagado: p.pagado,
      medioPago: p.medio_pago as MedioPagoPremio | null,
      montoEfectivo: p.monto_efectivo === null ? null : Number(p.monto_efectivo),
      montoTransferencia: p.monto_transferencia === null ? null : Number(p.monto_transferencia),
      fechaSorteo: p.fecha_sorteo,
      creadoEn: p.creado_en,
    })),
  };
}
