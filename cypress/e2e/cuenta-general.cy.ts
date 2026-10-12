import type { DatosPrueba } from "../support/db";

interface CorteHoy {
  id: string;
  fecha: string;
  turno: string;
}

function numeroDesdeTexto(texto: string): number {
  return Number(texto.replace(/[^0-9-]/g, ""));
}

// La apertura/cierre de turno y el aporte automático por premio usan la hora
// real (no una fecha de prueba), así que este test opera sobre el turno real
// de HOY — pero solo si todavía no lo abrió nadie: si ya está abierto (uso
// real de la agencia en paralelo), no se toca nada y el test no hace nada.
const NOMBRE_CLIENTE = "TMP CUENTA GENERAL Cliente";

describe("Cuenta general (efectivo)", () => {
  let datos: DatosPrueba;
  let clienteId: string | null = null;
  let corteCreado: string | null = null;

  before(() => {
    cy.task<DatosPrueba>("db:preparar").then((d) => (datos = d));
    // Sin ningún movimiento previo (a diferencia de "TMP CLIENTE", que ya
    // trae su propia deuda del fixture base): así el premio no se mezcla con
    // ninguna cancelación de deuda y el neto a pagar es el monto completo.
    cy.task<{ clienteId: string }>("db:sembrarClienteLimpio", NOMBRE_CLIENTE).then(
      (c) => (clienteId = c.clienteId)
    );
  });

  after(() => {
    cy.task("db:limpiarMovimientoCuentaGeneral", "TMP ajuste de prueba");
    if (corteCreado) cy.task("db:limpiarCorteYCuentaGeneral", corteCreado);
    if (clienteId) cy.task("db:limpiarClienteLimpio", clienteId);
    cy.task("db:limpiar", datos);
  });

  const elementoSaldoCuentaGeneral = () => cy.get('[data-campo="saldo-efectivo"]');

  // Lectura puntual (sin reintentar) — solo para capturar un valor de
  // referencia ANTES de hacer una acción, momento en que no hay ninguna
  // carrera con un refresco pendiente.
  const leerSaldoCuentaGeneral = () =>
    elementoSaldoCuentaGeneral()
      .invoke("text")
      .then((t) => numeroDesdeTexto(t));

  // Assertion reintentable de verdad: router.refresh() tarda un toque en
  // reflejarse, así que hace falta que Cypress vuelva a leer el DOM hasta
  // que coincida (un `.invoke("text").then(...)` suelto NO se reintenta).
  const esperarSaldoCuentaGeneral = (esperado: number) =>
    elementoSaldoCuentaGeneral().should(($p) => {
      expect(numeroDesdeTexto($p.text())).to.eq(esperado);
    });

  const esperarTotalEsperadoEfectivo = (esperado: number) =>
    cy
      .contains("Total esperado en efectivo")
      .parent()
      .find("p.text-2xl")
      .should(($p) => {
        expect(numeroDesdeTexto($p.text())).to.eq(esperado);
      });

  it("ajuste manual suma y resta del saldo", () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/caja");

    leerSaldoCuentaGeneral().then((saldoAntes) => {
      cy.contains("Agregar ajuste manual")
        .parent()
        .within(() => {
          // "Cuenta" queda en Efectivo (el default) — acá solo se toca "Tipo".
          cy.contains("label", "Tipo").find("select").select("ingreso");
          cy.get('input[type="text"]').type("TMP ajuste de prueba");
          cy.get('input[type="number"]').type("123");
          cy.contains("button", "Agregar ajuste manual").click();
        });
      cy.contains("TMP ajuste de prueba");
      esperarSaldoCuentaGeneral(saldoAntes + 123);
    });
  });

  it("abrir resta el fondo fijo, un premio grande saca la diferencia y cerrar deposita todo", () => {
    cy.login(datos, "dueno");
    cy.visit("/gestion/caja");

    cy.task<CorteHoy | null>("db:buscarCorteHoy").then((existente) => {
      if (existente) {
        cy.log("El turno real de hoy ya está abierto: se salta este test para no tocarlo.");
        return;
      }

      cy.contains("Este turno todavía no se abrió");

      leerSaldoCuentaGeneral().then((saldoInicial) => {
        // Abrir con un fondo fijo de prueba: la cuenta general tiene que bajar justo eso.
        cy.contains("label", "Monto inicial en efectivo").find("input").clear().type("500");
        cy.contains("button", "Abrir turno").click();

        // Hay que esperar a que la UI confirme que el turno se creó (la
        // acción es async) antes de ir a buscar su id — si no, la consulta
        // puede llegar antes de que exista la fila.
        cy.contains("Saldo inicial en efectivo (fondo fijo de este turno)");

        cy.task<CorteHoy | null>("db:buscarCorteHoy").then((c) => {
          corteCreado = c?.id ?? null;
          expect(corteCreado, "el turno se tiene que haber creado").to.be.a("string");
        });

        esperarSaldoCuentaGeneral(saldoInicial - 500);

        // Premio en efectivo más grande que el fondo fijo ($2.000 > $500):
        // la diferencia ($1.500) tiene que salir sola de la cuenta general.
        cy.visit("/gestion/jugadas");
        cy.get('input[placeholder*="Nombre, sobrenombre"]').type(NOMBRE_CLIENTE);
        cy.contains("li button", NOMBRE_CLIENTE).click();
        cy.contains("form", "Cargar premio").within(() => {
          cy.get('input[placeholder*="aciertos"]').type("premio test cuenta general");
          cy.get('label:contains("Monto") input').type("2000");
          cy.contains("label", "Ya se lo pagué").find("input[type=checkbox]").check();
          cy.contains("button", "Cargar premio").click();
        });
        cy.contains("Premio cargado.");

        cy.visit("/gestion/caja");
        esperarTotalEsperadoEfectivo(0);
        cy.contains("Aporte desde la cuenta general");
        esperarSaldoCuentaGeneral(saldoInicial - 500 - 1500);

        // Cerrar con un monto contado cualquiera ($777): tiene que depositarse entero.
        cy.contains("label", "Monto contado").find("input").type("777");
        cy.contains("button", "Cerrar corte").click();
        cy.contains("Corte cerrado");
        esperarSaldoCuentaGeneral(saldoInicial - 2000 + 777);

        // Reabrir: el depósito del cierre se deshace.
        cy.contains("button", "Reabrir corte").click();
        cy.contains("Cerrar corte");
        esperarSaldoCuentaGeneral(saldoInicial - 2000);
      });
    });
  });
});
