"use client";

import { useMemo, useState } from "react";
import { formatearMensajeQuini6 } from "@/lib/quini6/mensaje";
import { linkWhatsapp } from "@/lib/whatsapp";
import SelectorNumeros from "./SelectorNumeros";

export default function CrearJugadaQuini6({ hoy }: { hoy: string }) {
  const [fecha, setFecha] = useState(hoy);
  const [numeros, setNumeros] = useState<string[]>([]);
  const [copiado, setCopiado] = useState(false);

  const esValido = numeros.length === 6;

  const mensaje = useMemo(() => {
    if (!esValido) return null;
    return formatearMensajeQuini6({ fecha, numeros });
  }, [esValido, fecha, numeros]);

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
      <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <label className="mb-4 flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
          Fecha del sorteo
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </label>

        <p className="mb-2 text-sm text-neutral-700 dark:text-neutral-300">
          Elegí 6 números — se juegan juntos a Tradicional, Revancha y Siempre Sale
        </p>
        <SelectorNumeros seleccionados={numeros} onChange={setNumeros} max={6} />
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
