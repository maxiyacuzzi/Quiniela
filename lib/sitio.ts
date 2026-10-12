// Netlify define URL (el dominio principal del sitio) en build y en runtime.
// El placeholder solo debería verse corriendo local sin .env.
// TODO(dueño): cargar el dominio real en Netlify si todavía no está configurado.
export const URL_SITIO = process.env.URL ?? "https://TU-DOMINIO.com.ar";

export const NOMBRE_SITIO = "AgenciaKava's";

// TODO(dueño): completar con los datos reales antes de publicar las páginas legales.
export const DATOS_LEGALES = {
  razonSocial: "[RAZÓN SOCIAL]",
  cuit: "[CUIT]",
  domicilio: "[DOMICILIO LEGAL]",
  email: "[EMAIL DE CONTACTO]",
  numeroAgencia: "[N.º DE AGENCIA OFICIAL]",
};
