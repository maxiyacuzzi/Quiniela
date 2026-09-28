"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DetalleDia,
  CorteDetalle,
  MovimientoCajaDetalle,
  VentaMostradorDetalle,
  CobroDeudaDetalle,
  JugadaDetalle,
  PremioDetalle,
} from "@/lib/detalle-dia";
import { TURNO_CAJA_LABEL, TurnoCaja } from "@/lib/caja";
import { MedioPago, MEDIOS_PAGO, MEDIO_PAGO_LABEL } from "@/lib/medios-pago";
import { Juego, JUEGOS, JUEGO_LABEL } from "@/lib/actividad-clientes";
import {
  guardarCorteAction,
  agregarMovimientoCajaDiaAction,
  editarMovimientoCajaAction,
  borrarMovimientoCajaAction,
  agregarVentaMostradorDiaAction,
  editarVentaMostradorAction,
  borrarVentaMostradorAction,
  editarCobroDeudaAction,
  borrarCobroDeudaAction,
  editarJugadaAction,
  borrarJugadaAction,
  editarPremioAction,
  borrarPremioAction,
} from "./actions";

function monto(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}
function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

const INPUT =
  "rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100";
const BTN =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800";
const BTN_PRIMARIO =
  "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50";
const BTN_PELIGRO =
  "rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950";

type Ejecutar = (fn: () => Promise<void>, alTerminar?: () => void) => void;

function Seccion({ titulo, vacio, children }: { titulo: string; vacio?: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{titulo}</h2>
      {vacio ? <p className="text-sm text-neutral-500">{vacio}</p> : children}
    </section>
  );
}

function SelectMedio({ valor, onChange }: { valor: MedioPago; onChange: (m: MedioPago) => void }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value as MedioPago)} className={INPUT}>
      {MEDIOS_PAGO.map((m) => (
        <option key={m} value={m}>
          {MEDIO_PAGO_LABEL[m]}
        </option>
      ))}
    </select>
  );
}

function SelectJuego({ valor, onChange }: { valor: Juego; onChange: (j: Juego) => void }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value as Juego)} className={INPUT}>
      {JUEGOS.map((j) => (
        <option key={j} value={j}>
          {JUEGO_LABEL[j]}
        </option>
      ))}
    </select>
  );
}

// Envoltorio común de una fila: muestra el resumen y, si se puede editar,
// los botones Editar / Borrar; al editar muestra el formulario.
function Fila({
  resumen,
  puedeEditar,
  pendiente,
  editor,
  onBorrar,
}: {
  resumen: React.ReactNode;
  puedeEditar: boolean;
  pendiente: boolean;
  editor: (cerrar: () => void) => React.ReactNode;
  onBorrar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  if (editando) {
    return (
      <li className="rounded-lg border border-neutral-300 bg-neutral-100 p-3 dark:border-neutral-700 dark:bg-neutral-900">
        {editor(() => setEditando(false))}
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 py-2 text-sm last:border-0 dark:border-neutral-800">
      <div className="min-w-0 flex-1 text-neutral-700 dark:text-neutral-300">{resumen}</div>
      {puedeEditar && (
        <div className="flex gap-2">
          {confirmando ? (
            <>
              <button type="button" disabled={pendiente} onClick={onBorrar} className={BTN_PELIGRO}>
                Confirmar borrado
              </button>
              <button type="button" onClick={() => setConfirmando(false)} className={BTN}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditando(true)} className={BTN}>
                Editar
              </button>
              <button type="button" onClick={() => setConfirmando(true)} className={BTN_PELIGRO}>
                Borrar
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function Acciones({ pendiente, onCancelar, guardarLabel = "Guardar" }: { pendiente: boolean; onCancelar: () => void; guardarLabel?: string }) {
  return (
    <div className="flex gap-2">
      <button type="submit" disabled={pendiente} className={BTN_PRIMARIO}>
        {pendiente ? "Guardando..." : guardarLabel}
      </button>
      <button type="button" onClick={onCancelar} className={BTN}>
        Cancelar
      </button>
    </div>
  );
}

// ---------- Cortes ----------

function CorteEditor({ c, fecha, puedeEditar, ejecutar, pendiente }: { c: CorteDetalle; fecha: string; puedeEditar: boolean; ejecutar: Ejecutar; pendiente: boolean }) {
  const [inicialEf, setInicialEf] = useState(String(c.saldoInicialEfectivo));
  const [inicialTr, setInicialTr] = useState(String(c.saldoInicialTransferencia));
  const [cerrado, setCerrado] = useState(c.cerrado);
  const [contEf, setContEf] = useState(c.contadoEfectivo === null ? "" : String(c.contadoEfectivo));
  const [contTr, setContTr] = useState(c.contadoTransferencia === null ? "" : String(c.contadoTransferencia));
  const [editando, setEditando] = useState(false);

  const difEf = c.contadoEfectivo === null ? null : c.contadoEfectivo - c.esperadoEfectivo;
  const difTr = c.contadoTransferencia === null ? null : c.contadoTransferencia - c.esperadoTransferencia;

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    ejecutar(
      () =>
        guardarCorteAction({
          fecha,
          turno: c.turno,
          saldoInicialEfectivo: Number(inicialEf),
          saldoInicialTransferencia: Number(inicialTr),
          cerrado,
          contadoEfectivo: contEf.trim() === "" ? null : Number(contEf),
          contadoTransferencia: contTr.trim() === "" ? null : Number(contTr),
        }),
      () => setEditando(false)
    );
  }

  const dato = (t: string, v: string, extra = "") => (
    <div>
      <p className="text-xs text-neutral-500">{t}</p>
      <p className={`text-sm font-medium ${extra}`}>{v}</p>
    </div>
  );
  const colorDif = (d: number | null) =>
    d === null || d === 0 ? "" : d > 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {TURNO_CAJA_LABEL[c.turno]}{" "}
          <span className="text-xs font-normal text-neutral-500">
            {c.cerrado ? "· cerrado" : c.existe ? "· abierto" : "· sin abrir (calculado)"}
          </span>
        </p>
        {puedeEditar && !editando && (
          <button type="button" onClick={() => setEditando(true)} className={BTN}>
            Editar saldos y cierre
          </button>
        )}
      </div>

      {!editando ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {dato("Inicial efectivo", monto(c.saldoInicialEfectivo))}
          {dato("Esperado efectivo", monto(c.esperadoEfectivo))}
          {dato("Contado", c.contadoEfectivo === null ? "—" : monto(c.contadoEfectivo))}
          {dato("Dif. efectivo", difEf === null ? "—" : difEf === 0 ? "Exacto" : monto(difEf), colorDif(difEf))}
          {dato("Inicial transf.", monto(c.saldoInicialTransferencia))}
          {dato("Esperado transf.", monto(c.esperadoTransferencia))}
          {dato("Saldo banco", c.contadoTransferencia === null ? "—" : monto(c.contadoTransferencia))}
          {dato("Dif. transf.", difTr === null ? "—" : difTr === 0 ? "Exacto" : monto(difTr), colorDif(difTr))}
        </div>
      ) : (
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-neutral-600 dark:text-neutral-400">
              Saldo inicial en efectivo
              <input type="number" required value={inicialEf} onChange={(e) => setInicialEf(e.target.value)} className={INPUT} data-campo={`ini-ef-${c.turno}`} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-600 dark:text-neutral-400">
              Saldo inicial en transferencias
              <input type="number" required value={inicialTr} onChange={(e) => setInicialTr(e.target.value)} className={INPUT} data-campo={`ini-tr-${c.turno}`} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={cerrado} onChange={(e) => setCerrado(e.target.checked)} data-campo={`cerrado-${c.turno}`} />
            Corte cerrado
          </label>
          {cerrado && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                Monto contado (efectivo)
                <input type="number" required min={0} value={contEf} onChange={(e) => setContEf(e.target.value)} className={INPUT} data-campo={`cont-ef-${c.turno}`} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                Saldo del banco (opcional)
                <input type="number" min={0} value={contTr} onChange={(e) => setContTr(e.target.value)} className={INPUT} data-campo={`cont-tr-${c.turno}`} />
              </label>
            </div>
          )}
          <p className="text-xs text-neutral-500">
            Cambiar el saldo inicial fija ese valor en este corte (ya no se hereda solo del anterior).
          </p>
          <Acciones pendiente={pendiente} onCancelar={() => setEditando(false)} />
        </form>
      )}
    </div>
  );
}

// ---------- Movimientos de caja ----------

function MovimientoFila({ m, puedeEditar, ejecutar, pendiente }: { m: MovimientoCajaDetalle; puedeEditar: boolean; ejecutar: Ejecutar; pendiente: boolean }) {
  const [concepto, setConcepto] = useState(m.concepto);
  const [importe, setImporte] = useState(String(m.monto));
  const [medio, setMedio] = useState<MedioPago>(m.medioPago);
  return (
    <Fila
      puedeEditar={puedeEditar}
      pendiente={pendiente}
      onBorrar={() => ejecutar(() => borrarMovimientoCajaAction(m.id))}
      resumen={
        <>
          <span className="text-xs text-neutral-500">{TURNO_CAJA_LABEL[m.turno]} · </span>
          {m.concepto} ·{" "}
          <span className={m.monto >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
            {m.monto >= 0 ? "+" : "-"}
            {monto(Math.abs(m.monto))}
          </span>{" "}
          · {MEDIO_PAGO_LABEL[m.medioPago]}
          {m.creadoPor && <span className="text-xs text-neutral-500"> · {m.creadoPor}</span>}
        </>
      }
      editor={(cerrar) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(() => editarMovimientoCajaAction({ id: m.id, concepto, monto: Number(importe), medioPago: medio }), cerrar);
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-wrap gap-2">
            <input value={concepto} onChange={(e) => setConcepto(e.target.value)} required className={`${INPUT} flex-1`} data-campo="mov-concepto" />
            <input type="number" value={importe} onChange={(e) => setImporte(e.target.value)} required className={`${INPUT} w-32`} data-campo="mov-monto" />
            <SelectMedio valor={medio} onChange={setMedio} />
          </div>
          <p className="text-xs text-neutral-500">Positivo: ingreso. Negativo: gasto.</p>
          <Acciones pendiente={pendiente} onCancelar={cerrar} />
        </form>
      )}
    />
  );
}

function NuevoMovimiento({ fecha, ejecutar, pendiente }: { fecha: string; ejecutar: Ejecutar; pendiente: boolean }) {
  const [turno, setTurno] = useState<TurnoCaja>("cierre");
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");
  const [medio, setMedio] = useState<MedioPago>("efectivo");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(
          () => agregarMovimientoCajaDiaAction({ fecha, turno, concepto, monto: Number(importe), medioPago: medio }),
          () => {
            setConcepto("");
            setImporte("");
          }
        );
      }}
      className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800"
    >
      <select value={turno} onChange={(e) => setTurno(e.target.value as TurnoCaja)} className={INPUT}>
        <option value="mediodia">Mediodía</option>
        <option value="cierre">Cierre</option>
      </select>
      <input placeholder="Concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} required className={`${INPUT} flex-1`} data-campo="nuevo-mov-concepto" />
      <input type="number" placeholder="Monto (− gasto)" value={importe} onChange={(e) => setImporte(e.target.value)} required className={`${INPUT} w-36`} data-campo="nuevo-mov-monto" />
      <SelectMedio valor={medio} onChange={setMedio} />
      <button type="submit" disabled={pendiente} className={BTN_PRIMARIO}>
        Agregar
      </button>
    </form>
  );
}

// ---------- Ventas de mostrador ----------

function VentaFila({ v, puedeEditar, ejecutar, pendiente }: { v: VentaMostradorDetalle; puedeEditar: boolean; ejecutar: Ejecutar; pendiente: boolean }) {
  const [importe, setImporte] = useState(String(v.monto));
  const [medio, setMedio] = useState<MedioPago>(v.medioPago);
  const [fechaSorteo, setFechaSorteo] = useState(v.fechaSorteo);
  return (
    <Fila
      puedeEditar={puedeEditar}
      pendiente={pendiente}
      onBorrar={() => ejecutar(() => borrarVentaMostradorAction(v.id))}
      resumen={
        <>
          <span className="text-xs text-neutral-500">{hora(v.creadoEn)} · </span>
          {monto(v.monto)} · {MEDIO_PAGO_LABEL[v.medioPago]}
          <span className="text-xs text-neutral-500"> · sorteo del {v.fechaSorteo}</span>
        </>
      }
      editor={(cerrar) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(() => editarVentaMostradorAction({ id: v.id, monto: Number(importe), medioPago: medio, fechaSorteo }), cerrar);
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-wrap gap-2">
            <input type="number" min={1} value={importe} onChange={(e) => setImporte(e.target.value)} required className={`${INPUT} w-32`} data-campo="venta-monto" />
            <SelectMedio valor={medio} onChange={setMedio} />
            <input type="date" value={fechaSorteo} onChange={(e) => setFechaSorteo(e.target.value)} required className={INPUT} />
          </div>
          <Acciones pendiente={pendiente} onCancelar={cerrar} />
        </form>
      )}
    />
  );
}

function NuevaVenta({ fecha, ejecutar, pendiente }: { fecha: string; ejecutar: Ejecutar; pendiente: boolean }) {
  const [turno, setTurno] = useState<TurnoCaja>("cierre");
  const [importe, setImporte] = useState("");
  const [medio, setMedio] = useState<MedioPago>("efectivo");
  const [fechaSorteo, setFechaSorteo] = useState(fecha);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(
          () => agregarVentaMostradorDiaAction({ dia: fecha, turno, fechaSorteo, monto: Number(importe), medioPago: medio }),
          () => setImporte("")
        );
      }}
      className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800"
    >
      <select value={turno} onChange={(e) => setTurno(e.target.value as TurnoCaja)} className={INPUT}>
        <option value="mediodia">Cobrada en Mediodía</option>
        <option value="cierre">Cobrada en Cierre</option>
      </select>
      <input type="number" min={1} placeholder="Monto" value={importe} onChange={(e) => setImporte(e.target.value)} required className={`${INPUT} w-32`} data-campo="nueva-venta-monto" />
      <SelectMedio valor={medio} onChange={setMedio} />
      <label className="flex items-center gap-1 text-xs text-neutral-500">
        Sorteo del
        <input type="date" value={fechaSorteo} onChange={(e) => setFechaSorteo(e.target.value)} required className={INPUT} />
      </label>
      <button type="submit" disabled={pendiente} className={BTN_PRIMARIO}>
        Agregar venta
      </button>
    </form>
  );
}

// ---------- Cobros de deuda ----------

function CobroFila({ c, puedeEditar, ejecutar, pendiente }: { c: CobroDeudaDetalle; puedeEditar: boolean; ejecutar: Ejecutar; pendiente: boolean }) {
  const [importe, setImporte] = useState(String(c.monto));
  const [medio, setMedio] = useState<MedioPago>(c.medioPago);
  return (
    <Fila
      puedeEditar={puedeEditar}
      pendiente={pendiente}
      onBorrar={() => ejecutar(() => borrarCobroDeudaAction(c.id))}
      resumen={
        <>
          <span className="text-xs text-neutral-500">{hora(c.creadoEn)} · </span>
          {c.clienteNombre} · {monto(c.monto)} · {MEDIO_PAGO_LABEL[c.medioPago]}
        </>
      }
      editor={(cerrar) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(() => editarCobroDeudaAction({ id: c.id, monto: Number(importe), medioPago: medio }), cerrar);
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-sm font-medium">{c.clienteNombre}</p>
          <div className="flex flex-wrap gap-2">
            <input type="number" min={1} value={importe} onChange={(e) => setImporte(e.target.value)} required className={`${INPUT} w-32`} data-campo="cobro-monto" />
            <SelectMedio valor={medio} onChange={setMedio} />
          </div>
          <p className="text-xs text-neutral-500">Borrar el cobro devuelve la deuda al cliente.</p>
          <Acciones pendiente={pendiente} onCancelar={cerrar} />
        </form>
      )}
    />
  );
}

// ---------- Jugadas y premios ----------

function JugadaFila({ j, puedeEditar, ejecutar, pendiente }: { j: JugadaDetalle; puedeEditar: boolean; ejecutar: Ejecutar; pendiente: boolean }) {
  const [juego, setJuego] = useState<Juego>(j.juego);
  const [importe, setImporte] = useState(String(j.importe));
  const [fiado, setFiado] = useState(j.fiado);
  const [medio, setMedio] = useState<MedioPago>(j.medioPago ?? "efectivo");
  const [fechaSorteo, setFechaSorteo] = useState(j.fechaSorteo ?? "");
  return (
    <Fila
      puedeEditar={puedeEditar}
      pendiente={pendiente}
      onBorrar={() => ejecutar(() => borrarJugadaAction(j.id))}
      resumen={
        <>
          <span className="text-xs text-neutral-500">{hora(j.creadoEn)} · </span>
          {j.clienteNombre} · {JUEGO_LABEL[j.juego]} · {monto(j.importe)} ·{" "}
          {j.fiado ? "Fiada" : j.medioPago ? MEDIO_PAGO_LABEL[j.medioPago] : "—"}
          {j.fechaSorteo && <span className="text-xs text-neutral-500"> · sorteo del {j.fechaSorteo}</span>}
        </>
      }
      editor={(cerrar) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(
              () => editarJugadaAction({ id: j.id, juego, importe: Number(importe), fiado, medioPago: fiado ? null : medio, fechaSorteo }),
              cerrar
            );
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-sm font-medium">{j.clienteNombre}</p>
          <div className="flex flex-wrap items-center gap-2">
            <SelectJuego valor={juego} onChange={setJuego} />
            <input type="number" min={1} value={importe} onChange={(e) => setImporte(e.target.value)} required className={`${INPUT} w-32`} data-campo="jugada-importe" />
            <input type="date" value={fechaSorteo} onChange={(e) => setFechaSorteo(e.target.value)} required className={INPUT} />
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={fiado} onChange={(e) => setFiado(e.target.checked)} data-campo="jugada-fiado" /> Fiada
            </label>
            {!fiado && <SelectMedio valor={medio} onChange={setMedio} />}
          </div>
          <Acciones pendiente={pendiente} onCancelar={cerrar} />
        </form>
      )}
    />
  );
}

function PremioFila({ p, puedeEditar, ejecutar, pendiente }: { p: PremioDetalle; puedeEditar: boolean; ejecutar: Ejecutar; pendiente: boolean }) {
  const [importe, setImporte] = useState(String(p.monto));
  const [pagado, setPagado] = useState(p.pagado);
  const [medio, setMedio] = useState<MedioPago>(p.medioPago ?? "efectivo");
  const [fechaSorteo, setFechaSorteo] = useState(p.fechaSorteo ?? "");
  return (
    <Fila
      puedeEditar={puedeEditar}
      pendiente={pendiente}
      onBorrar={() => ejecutar(() => borrarPremioAction(p.id))}
      resumen={
        <>
          <span className="text-xs text-neutral-500">{hora(p.creadoEn)} · </span>
          {p.clienteNombre} · {JUEGO_LABEL[p.juego]} · {monto(p.monto)} ·{" "}
          {p.pagado ? `Pagado (${p.medioPago ? MEDIO_PAGO_LABEL[p.medioPago] : "—"})` : "Se le debe"}
          {p.fechaSorteo && <span className="text-xs text-neutral-500"> · sorteo del {p.fechaSorteo}</span>}
        </>
      }
      editor={(cerrar) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(
              () => editarPremioAction({ id: p.id, monto: Number(importe), pagado, medioPago: pagado ? medio : null, fechaSorteo }),
              cerrar
            );
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-sm font-medium">
            {p.clienteNombre} · {JUEGO_LABEL[p.juego]}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min={1} value={importe} onChange={(e) => setImporte(e.target.value)} required className={`${INPUT} w-32`} data-campo="premio-monto" />
            <input type="date" value={fechaSorteo} onChange={(e) => setFechaSorteo(e.target.value)} required className={INPUT} />
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} data-campo="premio-pagado" /> Ya se pagó
            </label>
            {pagado && <SelectMedio valor={medio} onChange={setMedio} />}
          </div>
          <Acciones pendiente={pendiente} onCancelar={cerrar} />
        </form>
      )}
    />
  );
}

// ---------- Página ----------

export default function DetalleDiaClient({ detalle, puedeEditar }: { detalle: DetalleDia; puedeEditar: boolean }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ejecutar: Ejecutar = (fn, alTerminar) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        alTerminar?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  };

  const props = { puedeEditar, ejecutar, pendiente };

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <Seccion titulo="Cortes de caja">
        <div className="flex flex-col gap-3">
          {detalle.cortes.map((c) => (
            <CorteEditor
              key={`${c.turno}-${c.cerrado}-${c.saldoInicialEfectivo}-${c.saldoInicialTransferencia}-${c.contadoEfectivo}-${c.contadoTransferencia}`}
              c={c}
              fecha={detalle.fecha}
              {...props}
            />
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Movimientos sueltos de la caja" vacio={!detalle.movimientosCaja.length && !puedeEditar ? "No hay movimientos." : undefined}>
        {detalle.movimientosCaja.length === 0 && <p className="text-sm text-neutral-500">No hay movimientos.</p>}
        <ul>
          {detalle.movimientosCaja.map((m) => (
            <MovimientoFila key={m.id} m={m} {...props} />
          ))}
        </ul>
        {puedeEditar && <NuevoMovimiento fecha={detalle.fecha} ejecutar={ejecutar} pendiente={pendiente} />}
      </Seccion>

      <Seccion titulo="Ventas de mostrador" vacio={!detalle.ventasMostrador.length && !puedeEditar ? "No hay ventas." : undefined}>
        {detalle.ventasMostrador.length === 0 && <p className="text-sm text-neutral-500">No hay ventas.</p>}
        <ul>
          {detalle.ventasMostrador.map((v) => (
            <VentaFila key={v.id} v={v} {...props} />
          ))}
        </ul>
        {puedeEditar && <NuevaVenta fecha={detalle.fecha} ejecutar={ejecutar} pendiente={pendiente} />}
      </Seccion>

      <Seccion titulo="Cobros de deuda" vacio={!detalle.cobrosDeuda.length ? "No hay cobros de deuda." : undefined}>
        <ul>
          {detalle.cobrosDeuda.map((c) => (
            <CobroFila key={c.id} c={c} {...props} />
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Jugadas de clientes" vacio={!detalle.jugadas.length ? "No hay jugadas." : undefined}>
        <ul>
          {detalle.jugadas.map((j) => (
            <JugadaFila key={j.id} j={j} {...props} />
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Premios de clientes" vacio={!detalle.premios.length ? "No hay premios." : undefined}>
        <ul>
          {detalle.premios.map((p) => (
            <PremioFila key={p.id} p={p} {...props} />
          ))}
        </ul>
      </Seccion>
    </div>
  );
}
