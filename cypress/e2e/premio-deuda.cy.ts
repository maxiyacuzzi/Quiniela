import type { DatosPrueba, ClienteDeuda } from "../support/db";

interface MovimientoCliente {
  monto: number;
  concepto: string;
}

// El sistema tiene que calcular solo (sin que el dueño elija nada) cuánto de
// un premio cancela la deuda del cliente y cuánto hay que pagarle en mano —
// ver lib/deuda-premio.ts. El cliente de este spec debe exactamente $1.000.
describe("Cálculo automático de deuda al cargar un premio", () => {
  let datos: DatosPrueba;
  let cliente: ClienteDeuda;

  before(() => {
    cy.task<DatosPrueba>("db:preparar").then((d) => (datos = d));
    cy.task<ClienteDeuda>("db:sembrarClienteDeuda", 1000).then((c) => (cliente = c));
  });
  after(() => {
    cy.task("db:limpiarClienteDeuda", cliente);
    cy.task("db:limpiar", datos);
  });

  const formPremio = () =>
    cy.contains("form", "Cargar premio");

  beforeEach(() => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/jugadas");
    cy.get('input[placeholder*="Nombre, sobrenombre"]').type("TMP DEUDA Cliente");
    cy.contains("li button", "TMP DEUDA Cliente").click();
    formPremio().find('input[placeholder*="aciertos"]').type("premio test deuda");
    formPremio().contains("label", "Ya se lo pagué").find("input[type=checkbox]").check();
  });

  it("no hay botón para aplicar la deuda a mano", () => {
    cy.contains("button", "Aplicar").should("not.exist");
  });

  it("premio de $3.000 con deuda de $1.000: dice que hay que pagar $2.000", () => {
    formPremio().find('label:contains("Monto") input').type("3000");
    formPremio().should("contain", "Hay que pagarle $2.000");
  });

  it("premio de $500 con deuda de $1.000: dice que todavía debe $500", () => {
    formPremio().find('label:contains("Monto") input').type("500");
    formPremio().should("contain", "todavía te va a deber $500");
  });

  it("premio de $1.000 justo: cancela la deuda sin pagar nada en mano", () => {
    formPremio().find('label:contains("Monto") input').type("1000");
    formPremio().should("contain", "no hay que pagarle nada en mano");
    // Se cancela todo con la deuda: no aparece el selector de medio de pago
    // (el único <select> que queda es el de Juego, siempre presente).
    formPremio().find("select").should("have.length", 1);
  });

  it("guarda el premio de $3.000: cancela la deuda y registra los $2.000 en efectivo", () => {
    formPremio().find('label:contains("Monto") input').type("3000");
    formPremio().contains("button", "Cargar premio").click();
    cy.contains("Premio cargado.");

    cy.task<{ jugadas: unknown[]; premios: unknown[]; movimientos: MovimientoCliente[] }>(
      "db:cliente",
      cliente.clienteId
    ).then((e) => {
      const premio = e.premios[0] as {
        medio_pago: string;
        monto_efectivo: number | null;
        monto_transferencia: number | null;
        monto_cuenta: number | null;
        pagado: boolean;
      };
      expect(premio.pagado).to.eq(true);
      expect(premio.medio_pago).to.eq("mixto");
      expect(premio.monto_cuenta).to.eq(1000);
      expect(premio.monto_efectivo).to.eq(2000);
      expect(
        e.movimientos.some((m) => m.monto === -1000 && m.concepto.includes("aplicado a su cuenta"))
      ).to.eq(true);
    });
  });
});
