import type { Metadata } from "next";
import TextoLegal from "../TextoLegal";
import { DATOS_LEGALES, NOMBRE_SITIO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo ${NOMBRE_SITIO} trata tus datos personales.`,
};

// BORRADOR — tiene que revisarlo un abogado antes de publicarse.
export default function Privacidad() {
  const d = DATOS_LEGALES;
  return (
    <TextoLegal titulo="Política de privacidad" actualizado="[FECHA]">
      <p>
        {d.razonSocial} (CUIT {d.cuit}), con domicilio en {d.domicilio}, titular de la agencia
        oficial de lotería n.º {d.numeroAgencia} ({NOMBRE_SITIO}), es responsable del tratamiento
        de los datos personales que se recolectan en este sitio, conforme a la Ley 25.326 de
        Protección de los Datos Personales y su normativa complementaria.
      </p>

      <h2>Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>Fotos de tickets:</strong> si usás “Controlar premio” con una foto, la imagen se
          envía a Google (Gemini) solo para leer la jugada. No la guardamos en nuestra base de datos.
        </li>
        <li>
          <strong>Jugadas armadas en “Crear jugada”:</strong> no se guardan. Se arma un mensaje que
          vos decidís enviar por WhatsApp.
        </li>
        <li>
          <strong>Dirección IP:</strong> la registramos por un plazo breve (se borra pasado un día) para
          limitar el uso abusivo de la lectura de tickets.
        </li>
        <li>
          <strong>Clientes de la agencia:</strong> si tenés cuenta corriente con la agencia,
          guardamos tu nombre, apodo, teléfono y los movimientos de tu cuenta. Solo los ve el
          personal de la agencia.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        El sitio público no usa cookies de seguimiento ni de publicidad. Solo el panel interno de
        la agencia usa una cookie de sesión, necesaria para iniciar sesión.
      </p>

      <h2>Proveedores</h2>
      <ul>
        <li>Supabase Inc. — base de datos y autenticación.</li>
        <li>Netlify Inc. — alojamiento del sitio.</li>
        <li>Google LLC (Gemini) — lectura de fotos de tickets.</li>
      </ul>
      <p>
        Algunos de estos proveedores procesan datos fuera de Argentina. [REVISAR: transferencia
        internacional de datos, art. 12 de la Ley 25.326.]
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiendo a{" "}
        {d.email}. Respondemos el pedido de acceso dentro de los 10 días corridos y los de
        rectificación o supresión dentro de los 5 días hábiles, como fija la ley.
      </p>
      <p>
        La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la
        Ley 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes
        resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de
        protección de datos personales.
      </p>
    </TextoLegal>
  );
}
