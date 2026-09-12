"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FilaJurisdiccion } from "@/lib/queries";
import { TURNOS_ORDEN, TURNO_LABEL } from "@/lib/turnos";

const SEGUNDOS_POR_SLIDE = 9;
const MS_REFRESH_DATOS = 45_000;

export default function PantallaClient({
  fechaInicial,
  filasIniciales,
  esHoyInicial,
}: {
  fechaInicial: string;
  filasIniciales: FilaJurisdiccion[];
  esHoyInicial: boolean;
}) {
  const [fecha, setFecha] = useState(fechaInicial);
  const [filas, setFilas] = useState(filasIniciales);
  const [esHoy, setEsHoy] = useState(esHoyInicial);
  const [slide, setSlide] = useState(0);
  const [ahora, setAhora] = useState(() => new Date());

  // reloj en vivo
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // rotación: slide 0 es la tapa con el logo, luego una por jurisdicción
  const totalSlides = filas.length + 1;

  useEffect(() => {
    if (filas.length === 0) return;
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % totalSlides);
    }, SEGUNDOS_POR_SLIDE * 1000);
    return () => clearInterval(id);
  }, [filas.length, totalSlides]);

  // refresco de datos (sin recargar la página, para que quede prendida en un TV)
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/resultados", { cache: "no-store" });
        const json = await res.json();
        setFecha(json.fecha);
        setFilas(json.filas);
        setEsHoy(json.esFechaPedida);
      } catch {
        // si falla un refresco, se reintenta en el próximo ciclo
      }
    }, MS_REFRESH_DATOS);
    return () => clearInterval(id);
  }, []);

  const sinDatos = filas.length === 0;

  const horaTexto = ahora.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const esSlideLogo = slide === 0;
  const fila = esSlideLogo ? undefined : filas[slide - 1];

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-black px-[3vw] py-[2vh] text-white">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-[1.2vw]">
          <div className="rounded-xl bg-white p-[0.4vw]">
            <Image
              src="/kavas-logo-redondo.jpeg"
              alt="Kava's Agencia de Quiniela"
              width={1280}
              height={853}
              className="h-[7vh] w-auto object-contain"
              priority
            />
          </div>
          <h1 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold tracking-tight text-red-500">
            Cabezas del día
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[clamp(1.25rem,2.2vw,2rem)] font-mono font-semibold">
            {horaTexto}
          </div>
          <div className="text-[clamp(0.9rem,1.3vw,1.25rem)] text-neutral-400">
            {fecha}
            {!esHoy && !sinDatos && (
              <span className="ml-2 text-blue-400">(último día con sorteos)</span>
            )}
          </div>
        </div>
      </header>

      {sinDatos ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-[clamp(2rem,4vw,3.5rem)] font-bold text-neutral-300">
            Todavía no hay resultados guardados
          </p>
        </div>
      ) : esSlideLogo ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="rounded-[3vh] bg-white p-[3vh]">
            <Image
              src="/kavas-logo-redondo.jpeg"
              alt="Kava's Agencia de Quiniela"
              width={1280}
              height={853}
              className="h-[65vh] w-auto object-contain"
            />
          </div>
        </div>
      ) : (
        fila && (
          <>
            <h2 className="mt-[2vh] text-center text-[clamp(2.5rem,6vw,5.5rem)] font-extrabold tracking-tight">
              {fila.nombre}
            </h2>

            <div className="mt-[2vh] grid flex-1 grid-cols-5 gap-[1.2vw]">
              {TURNOS_ORDEN.map((turno) => {
                const numeros = fila.porTurno[turno];
                const cabeza = numeros[0];
                return (
                  <div
                    key={turno}
                    className="flex flex-col items-center rounded-2xl border border-neutral-800 bg-neutral-950 p-[1vw]"
                  >
                    <div className="text-[clamp(1rem,1.6vw,1.5rem)] font-semibold uppercase tracking-wide text-neutral-400">
                      {TURNO_LABEL[turno]}
                    </div>
                    <div className="my-[1.5vh]">
                      {cabeza ? (
                        <span className="font-mono text-[clamp(2.5rem,6.5vw,6rem)] font-black leading-none text-red-500">
                          {cabeza}
                        </span>
                      ) : (
                        <span className="font-mono text-[clamp(2.5rem,6.5vw,6rem)] font-black leading-none text-neutral-700">
                          —
                        </span>
                      )}
                    </div>
                    <ol className="grid w-full grid-cols-2 gap-x-[0.8vw] gap-y-[0.4vh] text-[clamp(0.85rem,1.3vw,1.3rem)] text-neutral-400">
                      {numeros.map((numero, i) => (
                        <li key={i} className="flex justify-between gap-1 font-mono">
                          <span className="text-neutral-600">{i + 1}.</span>
                          <span className={i === 0 ? "text-red-500" : ""}>{numero ?? "—"}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </>
        )
      )}

      <footer className="mt-[2vh] flex items-center justify-center gap-3">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <span
            key={i}
            className={`h-[0.8vh] w-[0.8vh] min-h-2 min-w-2 rounded-full transition-colors ${
              i === slide ? "bg-red-500" : "bg-neutral-700"
            }`}
          />
        ))}
      </footer>
    </main>
  );
}
