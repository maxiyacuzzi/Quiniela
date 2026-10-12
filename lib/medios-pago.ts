export type MedioPago = "efectivo" | "transferencia";

export const MEDIOS_PAGO: MedioPago[] = ["efectivo", "transferencia"];

export const MEDIO_PAGO_LABEL: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};

// Pagar un premio admite dos opciones más que el resto de los pagos
// (jugadas, ventas de mostrador, cobros de deuda, movimientos de caja, que
// siguen siendo uno u otro nomás):
// - "cuenta": si el cliente debe plata, el premio (o parte) se aplica a
//   cancelar esa deuda en vez de entregarse en mano — no es plata que entra
//   a la caja.
// - "mixto": se reparte entre efectivo, transferencia y/o cuenta (dos o las
//   tres a la vez). monto_efectivo / monto_transferencia / monto_cuenta en
//   premios_clientes tienen que sumar el monto total del premio.
export type MedioPagoPremio = MedioPago | "cuenta" | "mixto";

export const MEDIOS_PAGO_PREMIO: MedioPagoPremio[] = ["efectivo", "transferencia", "cuenta", "mixto"];

export const MEDIO_PAGO_PREMIO_LABEL: Record<MedioPagoPremio, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cuenta: "A cuenta (cancela su deuda)",
  mixto: "Mixto (combinación)",
};
