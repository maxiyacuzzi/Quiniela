export type MedioPago = "efectivo" | "transferencia";

export const MEDIOS_PAGO: MedioPago[] = ["efectivo", "transferencia"];

export const MEDIO_PAGO_LABEL: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};

// Pagar un premio admite además "mixto": parte en efectivo y parte por
// transferencia, descontando de las dos cuentas a la vez (ver monto_efectivo
// / monto_transferencia en premios_clientes). El resto de los pagos
// (jugadas, ventas de mostrador, cobros de deuda, movimientos de caja) sigue
// siendo uno u otro, nunca mixto.
export type MedioPagoPremio = MedioPago | "mixto";

export const MEDIOS_PAGO_PREMIO: MedioPagoPremio[] = ["efectivo", "transferencia", "mixto"];

export const MEDIO_PAGO_PREMIO_LABEL: Record<MedioPagoPremio, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mixto: "Mixto (efectivo + transferencia)",
};
