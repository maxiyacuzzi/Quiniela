// Si el cliente debe plata, un premio que se paga ahora la cancela sola, sin
// que haya que elegirlo a mano: esto calcula cuánto de ese premio se
// descuenta de la deuda y cuánto queda para pagarle en mano (o cuánto le
// sigue quedando debiendo, si el premio no alcanza).
export interface NetoPremio {
  montoACuenta: number; // parte del premio que cancela la deuda existente
  neto: number; // lo que hay que pagarle en mano (efectivo/transferencia)
  deudaRestante: number; // lo que le sigue debiendo si el premio no alcanzó a cubrir todo
}

export function calcularNetoPremio(montoPremio: number, saldoCliente: number): NetoPremio {
  const deuda = saldoCliente > 0 ? saldoCliente : 0;
  const montoACuenta = montoPremio > 0 ? Math.min(deuda, montoPremio) : 0;
  return {
    montoACuenta,
    neto: montoPremio - montoACuenta,
    deudaRestante: deuda - montoACuenta,
  };
}
