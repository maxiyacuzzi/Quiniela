export type MedioPago = "efectivo" | "transferencia";

export const MEDIOS_PAGO: MedioPago[] = ["efectivo", "transferencia"];

export const MEDIO_PAGO_LABEL: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};
