"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FilaJurisdiccion } from "@/lib/queries";
import { TURNOS_ORDEN, TURNO_LABEL } from "@/lib/turnos";
import RelojEnVivo from "../RelojEnVivo";

const SEGUNDOS_POR_SLIDE = 9;
const MS_REFRESH_DATOS = 45_000;

// Color fijo por jurisdicción (mismo criterio que /ultimo-sorteo).
const COLOR_JURISDICCION: Record<string, string> = {
  ciudad: "text-blue-400",
  provincia: "text-red-400",
  cordoba: "text-green-400",
  "santa-fe": "text-yellow-400",
  "entre-rios": "text-purple-400",
};

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

  // rotación: slide 0 es la tapa con el logo, luego una por turno (mostrando
  // todas las jurisdicciones juntas para ese turno)
  const totalSlides = TURNOS_ORDEN.length + 1;

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

  const esSlideLogo = slide === 0;
  const turnoActual = esSlideLogo ? undefined : TURNOS_ORDEN[slide - 1];

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-black px-[3vw] py-[2vh] text-white">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-[1.2vw]">
          <div className="rounded-xl bg-white p-[0.4vw]">
            <Image
              src="/kavas-logo-redondo.jpeg"
              alt="AgenciaKava's"
              width={1280}
              height={853}
              className="h-[7vh] w-auto object-contain"
              priority
            />
          </div>
          <h1 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold tracking-tight text-red-500">
            AgenciaKava&apos;s
          </h1>
        </div>
        <div className="text-right">
          <RelojEnVivo className="block text-[clamp(1.25rem,2.2vw,2rem)] font-mono font-semibold" />
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
              alt="AgenciaKava's"
              width={1280}
              height={853}
              className="h-[65vh] w-auto object-contain"
            />
          </div>
        </div>
      ) : (
        turnoActual && (
          <>
            <h2 className="mt-[0.8vh] text-center text-[clamp(2rem,5vw,4.5rem)] font-extrabold tracking-tight">
              {TURNO_LABEL[turnoActual]}
            </h2>

            <div className="mt-[0.8vh] grid flex-1 grid-cols-5 gap-[1.2vw]">
              {filas.map((fila) => {
                const numeros = fila.porTurno[turnoActual];
                const cabeza = numeros[0];
                const restantes = numeros.slice(1); // posiciones 2 a 10 (la 1 ya se muestra como cabeza)
                return (
                  <div
                    key={fila.slug}
                    className="flex flex-col items-center rounded-2xl border border-neutral-800 bg-neutral-950 p-[1vw]"
                  >
                    <div
                      className={`text-[clamp(1.2rem,2vw,1.9rem)] font-semibold uppercase tracking-wide ${
                        COLOR_JURISDICCION[fila.slug] ?? "text-neutral-400"
                      }`}
                    >
                      {fila.nombre}
                    </div>
                    <div className="my-[1vh]">
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
                    <ol className="grid w-full flex-1 grid-cols-1 content-around text-[clamp(1.3rem,5vh,3.2rem)]">
                      {restantes.map((numero, i) => (
                        <li key={i} className="flex justify-between gap-2 font-mono">
                          <span className="text-yellow-400">{i + 2}.</span>
                          <span className="text-white">{numero ?? "—"}</span>
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
