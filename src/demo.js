// Cuenta DEMO del CRM: sirve para presentar la app a futuros agentes con datos 100 % ficticios.
// - Entra con "Probar demo" en el login (usuario demo con contraseña pública; no tiene datos reales).
// - "Restablecer demo" (menú lateral, solo en la cuenta demo) borra lo que se haya movido y vuelve a cargar estos datos.
// - Las fechas se calculan con el día de hoy, así el Dashboard, los Recordatorios y la campanita siempre se ven vivos.

export const DEMO_EMAIL = "demo@jlconsultoria.mx";
export const DEMO_PASSWORD = "DemoJLCRM-2026";

export function esCuentaDemo(user) {
  return !!user && (user.email || "").toLowerCase() === DEMO_EMAIL;
}

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function dias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}
function meses(n, dia) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  if (dia) d.setDate(dia);
  return iso(d);
}
// Día del mes actual, sin pasarse de hoy (para que el alta siempre caiga en el mes en curso).
function altaEsteMes(dia) {
  const hoy = new Date();
  const d = Math.min(dia, hoy.getDate());
  return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(d)}`;
}
// Id numérico con la fecha de creación (el CRM deduce de ahí cuándo se dio de alta un prospecto).
function idDeHace(nDias, k = 0) {
  const d = new Date();
  d.setDate(d.getDate() - nDias);
  d.setHours(11, 30, 0, 0);
  return String(d.getTime() + k);
}
function cumple(anio, offsetDias) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${anio}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function poliza(id, o) {
  return {
    id,
    aseguradora: o.aseguradora,
    ramo: o.ramo,
    subramo: o.subramo,
    numeroPoliza: o.numero,
    primaAnual: String(o.prima),
    pagoFraccionado: o.frac || "Anual",
    metodoPago: o.metodo || "Domiciliado",
    moneda: o.moneda || "MXN",
    clasificacion: o.clas || "Nueva",
    inicioVigencia: o.inicio,
    finVigencia: o.fin,
    fechaAlta: o.alta,
    fechaPago: o.pago || "",
    fechaRenovacion: o.fin,
    documento: null,
  };
}

function construirClientes() {
  const c = (id, nombre, tel, correo, cumpleAnio, cumpleOffset, origen, polizas, factura = false) => ({
    id, nombre, telefono: tel, correo, requiereFactura: factura,
    fechaCumple: cumple(cumpleAnio, cumpleOffset), origen, polizas,
  });
  return [
    c("demo-c1", "Mariana Soto Ibarra", "2225550101", "mariana.soto@correo-demo.mx", 1988, 3, "Referido", [
      poliza("demo-c1-p1", { aseguradora: "GNP Seguros", ramo: "Vida", subramo: "Vida Individual", numero: "VI-480112", prima: 24800, frac: "Mensual", inicio: meses(-4, 12), fin: meses(8, 12), alta: altaEsteMes(2), pago: dias(2) }),
      poliza("demo-c1-p2", { aseguradora: "Qualitas", ramo: "Autos", subramo: "Automóviles Individuales", numero: "QA-77310", prima: 14200, frac: "Semestral", metodo: "Tarjeta de crédito", clas: "Renovación", inicio: meses(-11, 20), fin: dias(12), alta: meses(-11, 20), pago: dias(12) }),
    ]),
    c("demo-c2", "Roberto Garza Fuentes", "2225550102", "roberto.garza@correo-demo.mx", 1979, 9, "Cartera actual", [
      poliza("demo-c2-p1", { aseguradora: "AXA Seguros", ramo: "GMM", subramo: "Gastos Médicos Ind", numero: "GM-229031", prima: 38600, frac: "Trimestral", inicio: meses(-3, 5), fin: meses(9, 5), alta: altaEsteMes(4), pago: dias(5) }),
    ], true),
    c("demo-c3", "Daniela Ruiz Cabrera", "2225550103", "daniela.ruiz@correo-demo.mx", 1993, 20, "Redes sociales", [
      poliza("demo-c3-p1", { aseguradora: "Zurich", ramo: "Autos", subramo: "Automóviles Individuales", numero: "ZU-554412", prima: 11900, frac: "Anual", metodo: "Transferencia", inicio: meses(-2, 8), fin: meses(10, 8), alta: altaEsteMes(1) }),
    ]),
    c("demo-c4", "Familia Herrera Montes", "2225550104", "herrera.montes@correo-demo.mx", 1975, 14, "Referido", [
      poliza("demo-c4-p1", { aseguradora: "MetLife", ramo: "Vida", subramo: "Educación", numero: "ED-103388", prima: 19400, frac: "Mensual", inicio: meses(-8, 15), fin: meses(4, 15), alta: meses(-8, 15), pago: dias(8) }),
      poliza("demo-c4-p2", { aseguradora: "GNP Seguros", ramo: "GMM", subramo: "Gastos Médicos Familiar", numero: "GF-660219", prima: 52300, frac: "Trimestral", inicio: meses(-9, 22), fin: dias(19), clas: "Renovación", alta: meses(-9, 22), pago: dias(19) }),
    ]),
    c("demo-c5", "Luis Ángel Pacheco", "2225550105", "luis.pacheco@correo-demo.mx", 1990, 27, "Landing page", [
      poliza("demo-c5-p1", { aseguradora: "Mapfre", ramo: "Hogar", subramo: "Hogar Familiar", numero: "HF-90271", prima: 6800, frac: "Anual", inicio: meses(-6, 3), fin: meses(6, 3), alta: meses(-6, 3) }),
    ]),
    c("demo-c6", "Carolina Espinosa Vega", "2225550106", "carolina.espinosa@correo-demo.mx", 1984, 40, "Evento / networking", [
      poliza("demo-c6-p1", { aseguradora: "AXA Seguros", ramo: "Plan Personal de Retiro (PPR)", subramo: "", numero: "PPR-31877", prima: 60000, frac: "Mensual", inicio: meses(-5, 10), fin: meses(7, 10), alta: altaEsteMes(3), pago: dias(10) }),
    ]),
    c("demo-c7", "Taller Mecánico Hermanos Ríos", "2225550107", "contacto@tallerrios-demo.mx", 1970, 55, "Empresa / B2B", [
      poliza("demo-c7-p1", { aseguradora: "Chubb Seguros", ramo: "Daños", subramo: "Negocio Protegido", numero: "NP-118204", prima: 21500, frac: "Semestral", inicio: meses(-3, 18), fin: meses(9, 18), alta: altaEsteMes(2), pago: dias(25) }),
      poliza("demo-c7-p2", { aseguradora: "Qualitas", ramo: "Autos", subramo: "Camiones Individuales", numero: "QC-88410", prima: 17800, frac: "Anual", inicio: meses(-7, 2), fin: meses(5, 2), alta: meses(-7, 2) }),
    ], true),
    c("demo-c8", "Paola Villanueva Cruz", "2225550108", "paola.villanueva@correo-demo.mx", 1996, 70, "Redes sociales", [
      poliza("demo-c8-p1", { aseguradora: "Plan Seguro", ramo: "Mascotas", subramo: "Mascotas", numero: "MA-4402", prima: 4200, frac: "Anual", inicio: meses(-1, 9), fin: meses(11, 9), alta: altaEsteMes(1) }),
    ]),
    c("demo-c9", "Javier Camacho Torres", "2225550109", "javier.camacho@correo-demo.mx", 1982, 100, "Prospección en frío", [
      poliza("demo-c9-p1", { aseguradora: "GNP Seguros", ramo: "Autos", subramo: "Automóviles Individuales", numero: "GA-302115", prima: 16400, frac: "Trimestral", clas: "Renovación", inicio: meses(-11, 28), fin: dias(27), alta: meses(-11, 28), pago: dias(27) }),
    ]),
    c("demo-c10", "Sofía Elizondo Barrera", "2225550110", "sofia.elizondo@correo-demo.mx", 1991, 130, "Referido", [
      poliza("demo-c10-p1", { aseguradora: "Zurich", ramo: "Vida", subramo: "Vida Individual", numero: "ZV-71906", prima: 28900, frac: "Mensual", metodo: "Tarjeta de débito", inicio: meses(-10, 6), fin: meses(2, 6), alta: meses(-10, 6), pago: dias(1) }),
    ]),
  ];
}

function construirProspectos() {
  const p = (nDias, nombre, tel, origen, estado, notas, extra = {}) => ({
    id: idDeHace(nDias, 1),
    nombre, telefono: tel, correo: "", origen, estado, notas,
    motivoPerdido: "", comentarioPerdido: "",
    requiereSeguimiento: false, accionSeguimiento: "", horaSeguimiento: "", fechaSeguimiento: "",
    cotizaciones: [],
    ...extra,
  });
  return [
    p(1, "Andrea Medina (Prospecto demo)", "2225550201", "Redes sociales", "Nuevo prospecto", "Llegó por Instagram preguntando por seguro de vida."),
    p(3, "Héctor Salazar (Prospecto demo)", "2225550202", "Referido", "Contactado", "Referido por Roberto. Busca GMM para su familia."),
    p(5, "Gabriela Núñez (Prospecto demo)", "2225550203", "Landing page", "Seguimiento", "Pidió diagnóstico patrimonial desde la página web.", {
      requiereSeguimiento: true, accionSeguimiento: "Llamada", horaSeguimiento: "16:30", fechaSeguimiento: dias(0),
    }),
    p(7, "Ricardo Lozano (Prospecto demo)", "2225550204", "Evento / networking", "Cita", "Cita para revisar su plan de retiro.", {
      requiereSeguimiento: true, accionSeguimiento: "Reunión Virtual", horaSeguimiento: "11:00", fechaSeguimiento: dias(1),
    }),
    p(9, "Verónica Aguilar (Prospecto demo)", "2225550205", "Cartera actual", "Cotización enviada", "Se le envió cotización de Autos con 3 aseguradoras."),
    p(12, "Empresa Distribuidora del Valle (Prospecto demo)", "2225550206", "Empresa / B2B", "Solicitud en trámite", "Plan empresarial para 18 colaboradores (GMM + Vida)."),
    p(16, "Fernando Ibáñez (Prospecto demo)", "2225550207", "Prospección en frío", "Perdido", "No tenía presupuesto este año.", {
      motivoPerdido: "No tiene presupuesto", comentarioPerdido: "Retomar en enero.",
    }),
    p(20, "Lucía Marín (Prospecto demo)", "2225550208", "Redes sociales", "Perdido", "Eligió a otro agente.", {
      motivoPerdido: "Eligió otra aseguradora", comentarioPerdido: "",
    }),
  ];
}

function construirActividades(prospectos) {
  const seg = (k) => prospectos[k];
  return [
    { id: "demo-a1", fecha: dias(0), hora: "10:00", tipo: "Llamada", descripcion: "Llamar a Roberto para revisar renovación de su GMM", clienteId: "demo-c2" },
    { id: "demo-a2", fecha: dias(0), hora: "13:30", tipo: "Reunión", descripcion: "Entrega de póliza a Mariana Soto", clienteId: "demo-c1" },
    {
      id: "demo-a3", fecha: dias(0), hora: "16:30", tipo: "Llamada", descripcion: `Seguimiento a prospecto: ${seg(2).nombre}`, clienteId: "",
      prospectoId: seg(2).id, prospectoNombre: seg(2).nombre, prospectoTelefono: seg(2).telefono,
    },
    {
      id: "demo-a4", fecha: dias(1), hora: "11:00", tipo: "Reunión", descripcion: `Seguimiento a prospecto: ${seg(3).nombre}`, clienteId: "",
      prospectoId: seg(3).id, prospectoNombre: seg(3).nombre, prospectoTelefono: seg(3).telefono,
    },
    { id: "demo-a5", fecha: dias(2), hora: "09:30", tipo: "Tarea", descripcion: "Enviar comparativo de Autos a Verónica", clienteId: "" },
    { id: "demo-a6", fecha: dias(3), hora: "17:00", tipo: "Visita", descripcion: "Visita al Taller Hermanos Ríos para renovar Negocio Protegido", clienteId: "demo-c7" },
  ];
}

function construirLogActividad() {
  const tipos = ["llamada", "whatsapp", "seguimiento", "cita", "cotizacion", "solicitud", "servicio", "admin", "formacion"];
  const minutos = { llamada: 20, whatsapp: 10, seguimiento: 15, cita: 60, cotizacion: 40, solicitud: 30, servicio: 25, admin: 35, formacion: 45 };
  const origenes = ["Referido", "Redes sociales", "Landing page", "Evento / networking", "Cartera actual"];
  const log = [];
  let n = 0;
  for (let d = 0; d < 28; d++) {
    const dia = new Date();
    dia.setDate(dia.getDate() - d);
    if (dia.getDay() === 0) continue; // domingo
    const cuantas = 3 + (d % 3);
    for (let i = 0; i < cuantas; i++) {
      const tipo = tipos[(d * 3 + i * 2) % tipos.length];
      n += 1;
      log.push({ id: `demo-l${n}`, fecha: iso(dia), tipo, minutos: minutos[tipo], origen: origenes[(d + i) % origenes.length] });
    }
  }
  return log;
}

// Todo lo que la demo guarda en app_data (clave -> valor).
export function construirDatosDemo() {
  const prospectos = construirProspectos();
  return {
    agentProfile: { nombre: "Agente Demo", correo: DEMO_EMAIL },
    clients: construirClientes(),
    prospectos,
    activities: construirActividades(prospectos),
    documents: {},
    metaActividad: { metaMensual: 45000, diasLaborales: 22, comisionPromedio: 2800, supuestos: { contactosPorProspecto: 2.5, contactoACita: 0.25, citaACotizacion: 0.6, cotizacionASolicitud: 0.4, solicitudACierre: 0.8 } },
    actividadLog: construirLogActividad(),
    metasComisiones: {
      "Daños": { metaPolizas: "2", metaPrimaNeta: "30000" },
      Salud: { metaPolizas: "3", metaPrimaNeta: "120000" },
      "Vehículos": { metaPolizas: "4", metaPrimaNeta: "60000" },
      Vida: { metaPolizas: "3", metaPrimaNeta: "70000" },
      Otros: { metaPolizas: "1", metaPrimaNeta: "60000" },
    },
  };
}

// Claves que la demo deja vacías al restablecer (para que nadie herede datos de la prueba anterior).
const CLAVES_A_BORRAR = ["porcentajesComision", "tarjetaDigital", "notifsVistas", "siniestros_info", "dpat_casos", "dpat_perfil", "diag_casos", "diag_catalogo", "facturaDatos"];

export async function restablecerDemo() {
  const datos = construirDatosDemo();
  for (const [clave, valor] of Object.entries(datos)) {
    await window.storage.set(clave, JSON.stringify(valor));
  }
  for (const clave of CLAVES_A_BORRAR) {
    try { await window.storage.delete(clave); } catch { /* si no existía, no pasa nada */ }
  }
}
