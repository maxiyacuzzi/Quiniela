"use client";

import { useState, useTransition } from "react";
import { FilaJurisdiccion } from "@/lib/queries";
import { TurnoKey, TURNO_LABEL } from "@/lib/turnos";

// Mismos valores hex que compila Tailwind para estas clases (ver
// app/ultimo-sorteo/page.tsx) — no se puede usar html2canvas/similares acá
// porque Tailwind v4 emite colores en oklch()/lab(), que esas librerías no
// saben interpretar (fondo/texto quedarían negros). Dibujamos a mano con
// Canvas 2D directamente desde los datos, sin depender del DOM renderizado.
const COLOR_JURISDICCION: Record<string, string> = {
  ciudad: "#54a2ff",
  provincia: "#ff6568",
  cordoba: "#05df72",
  "santa-fe": "#fac800",
  "entre-rios": "#c07eff",
};

const NEGRO = "#000000";
const BLANCO = "#ffffff";
const ROJO_CABEZA = "#fb2c36";
const AMARILLO_POSICION = "#fac800";
const GRIS_BORDE = "#262626";
const GRIS_TEXTO = "#a1a1a1";
const FONDO_CARD = "#0a0a0a";

const ESCALA = 2; // resolución más nítida al hacer zoom en el chat
const ANCHO = 1080;
const PADDING = 48;
const ALTO_ENCABEZADO = 200;
const ALTO_CARD = 260;
const ALTO_PIE = 60;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dibujarCanvas(turno: TurnoKey, fecha: string, filas: FilaJurisdiccion[]): HTMLCanvasElement {
  const altoLogico = ALTO_ENCABEZADO + filas.length * ALTO_CARD + ALTO_PIE;

  const canvas = document.createElement("canvas");
  canvas.width = ANCHO * ESCALA;
  canvas.height = altoLogico * ESCALA;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(ESCALA, ESCALA);
  ctx.textBaseline = "top";

  ctx.fillStyle = NEGRO;
  ctx.fillRect(0, 0, ANCHO, altoLogico);

  ctx.fillStyle = BLANCO;
  ctx.font = "900 56px Arial";
  ctx.fillText(TURNO_LABEL[turno].toUpperCase(), PADDING, 36);

  ctx.fillStyle = GRIS_TEXTO;
  ctx.font = "28px Arial";
  ctx.fillText(fecha, PADDING, 104);

  let y = ALTO_ENCABEZADO;
  const anchoCard = ANCHO - PADDING * 2;
  const colWidth = (anchoCard - 48) / 3;

  for (const fila of filas) {
    const numeros = fila.porTurno[turno];
    const cabeza = numeros[0];
    const restantes = numeros.slice(1);

    ctx.fillStyle = FONDO_CARD;
    ctx.strokeStyle = GRIS_BORDE;
    ctx.lineWidth = 2;
    roundRect(ctx, PADDING, y, anchoCard, ALTO_CARD - 20, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLOR_JURISDICCION[fila.slug] ?? GRIS_TEXTO;
    ctx.font = "bold 32px Arial";
    ctx.fillText(fila.nombre.toUpperCase(), PADDING + 24, y + 20);

    ctx.fillStyle = ROJO_CABEZA;
    ctx.font = "900 68px monospace";
    ctx.fillText(cabeza ?? "—", PADDING + 24, y + 64);

    ctx.font = "bold 26px monospace";
    restantes.forEach((numero, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = PADDING + 24 + col * colWidth;
      const yy = y + 150 + row * 34;
      const etiqueta = `${i + 2}.`;
      ctx.fillStyle = AMARILLO_POSICION;
      ctx.fillText(etiqueta, x, yy);
      ctx.fillStyle = BLANCO;
      // Ancho real de la etiqueta (no fijo) — "10." ocupa más que "2." y se
      // pisaba con el número si el offset era el mismo para todas.
      ctx.fillText(numero ?? "—", x + ctx.measureText(etiqueta).width + 8, yy);
    });

    y += ALTO_CARD;
  }

  ctx.fillStyle = GRIS_TEXTO;
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("AgenciaKava's", ANCHO / 2, y + 16);
  ctx.textAlign = "left";

  return canvas;
}

export default function CompartirCaptura({
  turno,
  fecha,
  filas,
}: {
  turno: TurnoKey;
  fecha: string;
  filas: FilaJurisdiccion[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onCompartir() {
    setError(null);
    startTransition(async () => {
      try {
        const canvas = dibujarCanvas(turno, fecha, filas);
        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) throw new Error("No se pudo generar la imagen");

        const archivo = new File([blob], `sorteo-${fecha}.png`, { type: "image/png" });

        if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
          await navigator.share({
            files: [archivo],
            title: "Último sorteo",
            text: `Resultados de ${TURNO_LABEL[turno]} — ${fecha}`,
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `sorteo-${fecha}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        // El usuario cerró la hoja de compartir — no es un error real.
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error al generar la imagen");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onCompartir}
        disabled={isPending}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-500 disabled:opacity-60"
      >
        {isPending ? "Generando..." : "Compartir por WhatsApp"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
