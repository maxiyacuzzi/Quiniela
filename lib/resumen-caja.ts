import { getSupabaseAdmin } from "./supabase";
import { restarDias } from "./fechas";
import {
  IdentificadorCorte,
  FilaCorteDB,
  SELECT_FILA_CORTE,
  TurnoCaja,
  calcularCorteLectura,
  corteAnterior,
  corteSiguiente,
  getSaldoDeCierre,
  saldoDeCierre,
} from "./caja";
import { getLiquidacionDia } from "./liquidacion";

export interface CuentaDia {
  inicial: number;
  entro: number;
  salio: number;
  final: number; // lo contado si el Cierre ya se cerró; si no, lo esperado
  diferencia: number | null; // suma de (contado - esperado) de los cortes cerrados; null si no hay
}

export interface CuentaPremiosDia {
  inicial: number;
  depositos: number;
  pagos: number;
  final: number;
}

export interface DiaResumen {
  fecha: string;
  cortesCerrados: 0 | 1 | 2;
  efectivo: CuentaDia;
  transferencias: CuentaDia;
  // Solo se calculan para el dueño:
  cuentaPremios: CuentaPremiosDia | null;
  netoLoteria: number | null; // neto de la liquidación estimada de ese sorteo
}

const TURNOS: TurnoCaja[] = ["mediodia", "cierre"];

export async function getResumenDias(
  hasta: string,
  dias: number,
  incluirDueno: boolean
): Promise<DiaResumen[]> {
  const desde = restarDias(hasta, dias - 1);
  const supabase = getSupabaseAdmin();

  const [filasRes, premiosRes] = await Promise.all([
    supabase.from("cortes_caja").select(SELECT_FILA_CORTE).gte("fecha", desde).lte("fecha", hasta),
    incluirDueno
      ? supabase.from("cuenta_premios_movimientos").select("fecha, monto").lte("fecha", hasta)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (filasRes.error) throw new Error(`Error al leer los cortes: ${filasRes.error.message}`);
  if (premiosRes.error) throw new Error(`Error al leer la cuenta de premios: ${premiosRes.error.message}`);

  const filas = new Map<string, FilaCorteDB>();
  for (const f of (filasRes.data ?? []) as unknown as FilaCorteDB[]) {
    filas.set(`${f.fecha}|${f.turno}`, f);
  }

  // Saldos con los que arranca el primer día, y de ahí avanzamos corte por corte.
  const primero: IdentificadorCorte = { fecha: desde, turno: "mediodia" };
  let saldo = await getSaldoDeCierre(corteAnterior(primero));

  const porDia: DiaResumen[] = [];
  let cursor = primero;
  for (let d = 0; d < dias; d++) {
    const fecha = cursor.fecha;
    const cortes = [];
    for (const turno of TURNOS) {
      const id = { fecha, turno };
      const calc = await calcularCorteLectura(id, filas.get(`${fecha}|${turno}`) ?? null, saldo);
      saldo = saldoDeCierre(calc);
      cortes.push(calc);
      cursor = corteSiguiente(id);
    }

    const cuenta = (
      inicial: number,
      final: number,
      entro: number,
      salio: number,
      difs: number[]
    ): CuentaDia => ({
      inicial,
      entro,
      salio,
      final,
      diferencia: difs.length ? difs.reduce((a, b) => a + b, 0) : null,
    });

    const [md, ci] = cortes;
    const difEf = cortes
      .filter((c) => c.cerrado && c.contadoEfectivo !== null)
      .map((c) => c.contadoEfectivo! - c.esperadoEfectivo);
    const difTr = cortes
      .filter((c) => c.cerrado && c.contadoTransferencia !== null)
      .map((c) => c.contadoTransferencia! - c.esperadoTransferencia);

    porDia.push({
      fecha,
      cortesCerrados: cortes.filter((c) => c.cerrado).length as 0 | 1 | 2,
      efectivo: cuenta(
        md.saldoInicialEfectivo,
        saldoDeCierre(ci).efectivo,
        md.ingresosEfectivo + ci.ingresosEfectivo,
        md.egresosEfectivo + ci.egresosEfectivo,
        difEf
      ),
      transferencias: cuenta(
        md.saldoInicialTransferencia,
        saldoDeCierre(ci).transferencia,
        md.ingresosTransferencia + ci.ingresosTransferencia,
        md.egresosTransferencia + ci.egresosTransferencia,
        difTr
      ),
      cuentaPremios: null,
      netoLoteria: null,
    });
  }

  if (incluirDueno) {
    const movs = (premiosRes.data ?? []) as { fecha: string; monto: number }[];
    for (const dia of porDia) {
      const antes = movs.filter((m) => m.fecha < dia.fecha).reduce((a, m) => a + Number(m.monto), 0);
      const delDia = movs.filter((m) => m.fecha === dia.fecha).map((m) => Number(m.monto));
      const depositos = delDia.filter((m) => m > 0).reduce((a, m) => a + m, 0);
      const pagos = delDia.filter((m) => m < 0).reduce((a, m) => a + Math.abs(m), 0);
      dia.cuentaPremios = { inicial: antes, depositos, pagos, final: antes + depositos - pagos };
    }
    const liquidaciones = await Promise.all(porDia.map((d) => getLiquidacionDia(d.fecha)));
    liquidaciones.forEach((l, i) => (porDia[i].netoLoteria = l.netoTotal));
  }

  return porDia.reverse(); // el más nuevo arriba
}
