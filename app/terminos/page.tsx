import type { Metadata } from "next";
import Link from "next/link";
import TextoLegal from "../TextoLegal";
import { DATOS_LEGALES, NOMBRE_SITIO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Condiciones de uso del sitio de ${NOMBRE_SITIO}.`,
};

// BORRADOR — tiene que revisarlo un abogado antes de publicarse.
export default function Terminos() {
  const d = DATOS_LEGALES;
  return (
    <TextoLegal titulo="Términos y condiciones" actualizado="[FECHA]">
      <p>
        Este sitio es operado por {d.razonSocial} (CUIT {d.cuit}), agencia oficial de lotería
        n.º {d.numeroAgencia}. Al usarlo aceptás estas condiciones.
      </p>

      <h2>Carácter informativo</h2>
      <p>
        Los resultados de quiniela, Quini 6, Loto y Brinco se obtienen de fuentes públicas y se
        muestran solo a título informativo. Pueden tener demoras o errores. El único resultado
        válido para cobrar un premio es el extracto oficial de la lotería que corresponda.
      </p>

      <h2>Controlar premio y lectura de tickets</h2>
      <p>
        El control de premios, incluida la lectura automática de la foto del ticket, es orientativo.
        El premio se confirma únicamente presentando el ticket original en la agencia.
      </p>

      <h2>Crear jugada</h2>
      <p>
        Armar una jugada en el sitio no constituye una apuesta. La jugada recién existe cuando la
        agencia la registra y emite el ticket correspondiente.
      </p>

      <h2>Juego responsable</h2>
      <p>
        Prohibida la venta a menores de 18 años. [REVISAR: leyenda de juego responsable exigida por
        la lotería provincial correspondiente.]
      </p>

      <h2>Datos personales</h2>
      <p>
        El tratamiento de datos se rige por nuestra{" "}
        <Link href="/privacidad" className="text-red-600 underline dark:text-red-400">
          política de privacidad
        </Link>
        .
      </p>

      <h2>Contacto</h2>
      <p>
        {d.domicilio} · {d.email}
      </p>
    </TextoLegal>
  );
}
