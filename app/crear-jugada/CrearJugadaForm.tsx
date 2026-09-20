"use client";

import { useMemo, useState } from "react";
import { JURISDICCIONES } from "@/lib/jurisdicciones";
import { TURNOS_ORDEN, TURNO_LABEL, TurnoKey } from "@/lib/turnos";
import { esNumeroJugadoValido, TipoControlPremio } from "@/lib/premio";
import { formatearMensajeJugada, ItemJugada } from "@/lib/jugada";
import { linkWhatsapp } from "@/lib/whatsapp";

let siguienteId = 1;
function nuevaFila() {
  return { id: siguienteId++, numero: "", importe: "", tipo: "cabeza" as TipoControlPremio };
}

export default function CrearJugadaForm({ hoy }: { hoy: string }) {
  const [fecha, setFecha] = useState(hoy);
  const [jurisdiccionSlugs, setJurisdiccionSlugs] = useState<string[]>([]);
  const [turnos, setTurnos] = useState<TurnoKey[]>([]);
  const [filas, setFilas] = useState([nuevaFila(), nuevaFila(), nuevaFila()]);
  const [usarTotal, setUsarTotal] = useState(false);
  const [importeTotal, setImporteTotal] = useState("");
  const [copiado, setCopiado] = useState(false);

  function toggleJurisdiccion(slug: string) {
    setJurisdiccionSlugs((actual) =>
      actual.includes(slug) ? actual.filter((s) => s !== slug) : [...actual, slug]
    );
  }

  function toggleTurno(t: TurnoKey) {
    setTurnos((actual) => (actual.includes(t) ? actual.filter((x) => x !== t) : [...actual, t]));
  }

  function actualizarFila(id: number, campo: "numero" | "importe" | "tipo", valor: string) {
    setFilas((actual) => actual.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  }

  function agregarFila() {
    setFilas((actual) => [...actual, nuevaFila()]);
  }

  function quitarFila(id: number) {
    setFilas((actual) => (actual.length > 1 ? actual.filter((f) => f.id !== id) : actual));
  }

  const filasConNumero = filas.filter((f) => esNumeroJugadoValido(f.numero));
  const importeTotalNumero = Number(importeTotal);
  const importeTotalValido = importeTotal.trim() !== "" && importeTotalNumero > 0;
  const importePorFilaDelTotal =
    filasConNumero.length > 0 ? Math.round(importeTotalNumero / filasConNumero.length) : 0;

  const items: ItemJugada[] = useMemo(() => {
    return filas
      .filter((f) => esNumeroJugadoValido(f.numero))
      .map((f) => {
        const importe = usarTotal ? importePorFilaDelTotal : Number(f.importe);
        const importeValido = usarTotal
          ? importeTotalValido
          : f.importe.trim() !== "" && importe > 0;
        return importeValido ? { numeroJugado: f.numero, importe, tipo: f.tipo } : null;
      })
      .filter((item): item is ItemJugada => item !== null);
  }, [filas, usarTotal, importePorFilaDelTotal, importeTotalValido]);

  const esValido = jurisdiccionSlugs.length > 0 && turnos.length > 0 && items.length > 0;

  const mensaje = useMemo(() => {
    if (!esValido) return null;
    return formatearMensajeJugada({ fecha, jurisdiccionSlugs, turnos, items });
  }, [esValido, fecha, jurisdiccionSlugs, turnos, items]);

  async function copiarMensaje() {
    if (!mensaje) return;
    await navigator.clipboard.writeText(mensaje);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function enviarPorWhatsapp() {
    if (!mensaje) return;
    window.open(linkWhatsapp(mensaje), "_blank");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300 sm:col-span-2">
          Quiniela(s)
          <div className="flex flex-wrap gap-3 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950">
            {JURISDICCIONES.map((j) => (
              <label
                key={j.slug}
                className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200"
              >
                <input
                  type="checkbox"
                  checked={jurisdiccionSlugs.includes(j.slug)}
                  onChange={() => toggleJurisdiccion(j.slug)}
                  className="h-4 w-4 accent-red-600"
                />
                {j.nombre}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300 sm:col-span-2">
          Turno(s)
          <div className="flex flex-wrap gap-3 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950">
            {TURNOS_ORDEN.map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200"
              >
                <input
                  type="checkbox"
                  checked={turnos.includes(t)}
                  onChange={() => toggleTurno(t)}
                  className="h-4 w-4 accent-red-600"
                />
                {TURNO_LABEL[t]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Números y montos
          </h2>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={usarTotal}
              onChange={(e) => setUsarTotal(e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Repartir un importe total entre todos los números
          </label>
        </div>

        {usarTotal && (
          <label className="mb-4 flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            Importe total
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ej: 3000"
              value={importeTotal}
              onChange={(e) => setImporteTotal(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
            {importeTotalValido && filasConNumero.length > 0 && (
              <span className="text-xs text-neutral-500">
                ${importePorFilaDelTotal.toLocaleString("es-AR")} por número (
                {filasConNumero.length} número{filasConNumero.length > 1 ? "s" : ""})
              </span>
            )}
          </label>
        )}

        <div className="flex flex-col gap-2">
          {filas.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Número"
                value={f.numero}
                onChange={(e) =>
                  actualizarFila(f.id, "numero", e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="w-24 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-mono text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              />
              <select
                value={f.tipo}
                onChange={(e) => actualizarFila(f.id, "tipo", e.target.value)}
                className="rounded-lg border border-neutral-300 bg-neutral-100 px-2 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              >
                <option value="cabeza">A la cabeza</option>
                <option value="cualquiera">Primeros 10</option>
              </select>
              {!usarTotal && (
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Importe"
                  value={f.importe}
                  onChange={(e) => actualizarFila(f.id, "importe", e.target.value)}
                  className="w-28 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                />
              )}
              <button
                type="button"
                onClick={() => quitarFila(f.id)}
                disabled={filas.length === 1}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={agregarFila}
          className="mt-3 rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          + Agregar número
        </button>
      </div>

      {mensaje && (
        <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
          <h2 className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Vista previa del mensaje
          </h2>
          <pre className="whitespace-pre-wrap rounded-lg bg-neutral-100 p-3 font-mono text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
            {mensaje}
          </pre>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={enviarPorWhatsapp}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-500"
            >
              Enviar por WhatsApp
            </button>
            <button
              type="button"
              onClick={copiarMensaje}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              {copiado ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">Se envía a +54 9 3574 40-8820.</p>
        </div>
      )}
    </div>
  );
}
