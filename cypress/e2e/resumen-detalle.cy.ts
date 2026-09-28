import type { DatosPrueba } from "../support/db";

interface EstadoCliente {
  jugadas: { fiado: boolean; medio_pago: string | null; movimiento_id: string | null }[];
  premios: unknown[];
  movimientos: { monto: number; cobro_deuda: boolean }[];
}

// Cada test parte de datos frescos: un día vacío (2026-01-05) con una jugada
// fiada, un premio sin pagar y un cobro de deuda de un cliente TMP.
describe("Detalle del día (Resumen por día)", () => {
  let datos: DatosPrueba;

  beforeEach(() => {
    cy.task<DatosPrueba>("db:preparar").then((d) => (datos = d));
  });
  afterEach(() => {
    cy.task("db:limpiar", datos);
  });

  const irAlDia = () => cy.visit(`/gestion/caja/resumen/${datos.fecha}`);
  const fila = (texto: string) => cy.contains("li", texto);

  describe("como dueño", () => {
    beforeEach(() => cy.login(datos, "dueno"));

    it("hacer click en una fila del resumen abre el detalle", () => {
      cy.visit("/gestion/caja/resumen?dias=60");
      cy.get("tbody tr").eq(3).should("be.visible");
      cy.wait(1000); // deja que la página hidrate antes de hacer click en la fila
      cy.get("tbody tr").eq(3).click();
      cy.location("pathname").should("match", /\/gestion\/caja\/resumen\/\d{4}-\d{2}-\d{2}$/);
    });

    it("muestra la actividad del día", () => {
      irAlDia();
      cy.contains("Cortes de caja");
      fila("Fiada").should("contain", "TMP CLIENTE").and("contain", "$2.000"); // jugada
      cy.contains("li", "Se le debe").should("contain", "$500"); // premio
      cy.contains("Cobros de deuda").parent().should("contain", "$300");
    });

    it("agrega, edita y borra un movimiento de caja", () => {
      irAlDia();
      cy.get("[data-campo=nuevo-mov-concepto]").type("TEST gasto");
      cy.get("[data-campo=nuevo-mov-monto]").type("-500");
      cy.contains("button", "Agregar").click();
      fila("TEST gasto").should("contain", "-$500");

      fila("TEST gasto").contains("button", "Editar").click();
      cy.get("[data-campo=mov-monto]").clear().type("-700");
      cy.contains("button", "Guardar").click();
      fila("TEST gasto").should("contain", "-$700");

      fila("TEST gasto").contains("button", "Borrar").click();
      fila("TEST gasto").contains("button", "Confirmar borrado").click();
      cy.contains("TEST gasto").should("not.exist");
    });

    it("agrega una venta de mostrador", () => {
      irAlDia();
      cy.get("[data-campo=nueva-venta-monto]").type("1000");
      cy.contains("button", "Agregar venta").click();
      cy.contains("Ventas de mostrador").parent().should("contain", "$1.000");
    });

    it("edita y cierra el corte de Cierre", () => {
      irAlDia();
      cy.get("button").filter(":contains('Editar saldos y cierre')").last().click();
      cy.get("[data-campo=ini-ef-cierre]").clear().type("100");
      cy.get("[data-campo=cerrado-cierre]").check();
      cy.get("[data-campo=cont-ef-cierre]").type("300");
      cy.contains("button", "Guardar").click();
      cy.contains("· cerrado");
      cy.contains("$300");
    });

    it("permite un saldo inicial negativo", () => {
      irAlDia();
      cy.contains("button", "Editar saldos y cierre").first().click();
      cy.get("[data-campo=ini-ef-mediodia]").clear().type("-2644000");
      cy.contains("button", "Guardar").click();
      cy.contains("$-2.644.000"); // así formatea la app los negativos
    });

    it("pasar una jugada de fiada a pagada borra su deuda", () => {
      irAlDia();
      fila("Fiada").contains("button", "Editar").click();
      cy.get("[data-campo=jugada-fiado]").uncheck();
      cy.contains("button", "Guardar").click();
      cy.contains("Fiada").should("not.exist");

      cy.task<EstadoCliente>("db:cliente", datos.clienteId).then((e) => {
        expect(e.jugadas).to.have.length(1);
        expect(e.jugadas[0].fiado).to.eq(false);
        expect(e.jugadas[0].movimiento_id).to.eq(null);
        expect(e.movimientos.some((m) => m.monto === 2000)).to.eq(false);
      });
    });

    it("borrar un premio borra también su deuda", () => {
      irAlDia();
      fila("Se le debe").contains("button", "Borrar").click();
      fila("Se le debe").contains("button", "Confirmar borrado").click();
      cy.contains("Se le debe").should("not.exist");

      cy.task<EstadoCliente>("db:cliente", datos.clienteId).then((e) => {
        expect(e.premios).to.have.length(0);
        expect(e.movimientos.some((m) => m.monto === -500)).to.eq(false);
      });
    });

    it("borrar un cobro de deuda le devuelve la deuda al cliente", () => {
      irAlDia();
      cy.contains("Cobros de deuda").parent().contains("button", "Borrar").click();
      cy.contains("Cobros de deuda").parent().contains("button", "Confirmar borrado").click();
      cy.contains("No hay cobros de deuda");

      cy.task<EstadoCliente>("db:cliente", datos.clienteId).then((e) => {
        expect(e.movimientos.some((m) => m.cobro_deuda)).to.eq(false);
      });
    });

    it("cancelar la edición no guarda nada", () => {
      irAlDia();
      fila("Fiada").contains("button", "Editar").click();
      cy.get("[data-campo=jugada-importe]").clear().type("9999");
      cy.contains("button", "Cancelar").click();
      fila("Fiada").should("contain", "$2.000");
    });
  });

  describe("como empleado", () => {
    beforeEach(() => cy.login(datos, "empleado"));

    it("ve el detalle pero sin botones de edición", () => {
      irAlDia();
      fila("Fiada").should("contain", "$2.000");
      cy.contains("button", /Editar|Borrar|Agregar|Guardar/).should("not.exist");
    });
  });
});
