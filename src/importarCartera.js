import * as XLSX from "xlsx";

// Lógica para importar una cartera (clientes + pólizas) desde Excel o CSV.
// Una fila por póliza. También lee el Excel que exporta este mismo CRM (hojas "Clientes" y "Pólizas").

const norm = (s) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const digits = (s) => String(s ?? "").replace(/\D/g, "");
const txt = (v) => (v === null || v === undefined ? "" : String(v).trim());

const ALIAS = {
  nombre: ["nombre", "cliente", "nombre completo", "nombre del cliente", "asegurado", "contratante"],
  telefono: ["telefono", "tel", "celular", "whatsapp", "movil", "telefono celular"],
  correo: ["correo", "correo electronico", "email", "e mail", "mail"],
  requiereFactura: ["requiere factura", "factura"],
  fechaCumple: ["cumpleanos", "fecha de nacimiento", "nacimiento", "fecha cumpleanos", "fecha de cumpleanos"],
  aseguradora: ["aseguradora", "compania", "cia", "aseguradora compania"],
  ramo: ["ramo", "producto", "tipo de seguro", "tipo seguro"],
  numeroPoliza: ["numero de poliza", "no de poliza", "no poliza", "poliza", "num poliza", "n poliza", "numero poliza"],
  primaAnual: ["prima anual", "prima", "prima neta", "prima neta anual", "prima total"],
  moneda: ["moneda"],
  pagoFraccionado: ["pago fraccionado", "fraccionamiento", "periodicidad"],
  formaPago: ["forma de pago", "forma pago"],
  metodoPago: ["metodo de pago", "metodo pago"],
  clasificacion: ["clasificacion", "tipo de poliza"],
  inicioVigencia: ["inicio de vigencia", "inicio vigencia", "vigencia desde", "desde", "fecha de inicio"],
  finVigencia: ["fin de vigencia", "fin vigencia", "vigencia hasta", "hasta", "fecha de fin", "vencimiento"],
  fechaAlta: ["fecha de contratacion", "fecha de alta", "fecha contratacion", "alta"],
  fechaPago: ["fecha de pago", "proximo pago", "fecha pago"],
  fechaRenovacion: ["fecha de renovacion", "renovacion", "fecha renovacion"],
};
const ALIAS_LOOKUP = {};
Object.entries(ALIAS).forEach(([campo, lista]) => lista.forEach((a) => { ALIAS_LOOKUP[a] = campo; }));

const CAMPOS_POLIZA = ["aseguradora", "ramo", "numeroPoliza", "primaAnual"];

function pad(n) { return String(n).padStart(2, "0"); }

// Convierte lo que venga en la celda a "YYYY-MM-DD" (o "" si está vacío, o null si no se entiende).
export function parseFecha(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number" && isFinite(v) && v > 59 && v < 80000) {
    const dia = Math.floor(v + 1e-6); // tolera redondeos mínimos del lector (46053.99999 = 46054)
    const d = new Date(Math.round((dia - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v).trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valida(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return valida(y, +m[2], +m[1]);
  }
  return null;
}
function valida(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

function parseNumero(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v ?? "").replace(/[$\s,]/g, "");
  if (s === "") return "";
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function buscarOpcion(valor, lista) {
  const n = norm(valor);
  if (!n) return "";
  return lista.find((o) => norm(o) === n) || "";
}

const RAMO_ALIAS = [
  [/^(auto|autos|automovil|automoviles|carro)$/, "Autos"],
  [/^(gmm|gastos medicos|gastos medicos mayores|salud|medico)$/, "GMM"],
  [/^(vida)$/, "Vida"],
  [/^(ppr|retiro|plan personal de retiro)$/, "Plan Personal de Retiro (PPR)"],
  [/^(hogar|casa)$/, "Hogar"],
  [/^(mascota|mascotas)$/, "Mascotas"],
];

function normalizaPoliza(r, o) {
  const aseg = txt(r.aseguradora);
  const asegCanon = buscarOpcion(aseg, o.ASEGURADORAS.filter((a) => a !== "Otra")) || aseg;

  let ramo = txt(r.ramo);
  const ramoLista = buscarOpcion(ramo, o.RAMOS.filter((x) => x !== "Otro"));
  if (ramoLista) ramo = ramoLista;
  else {
    const hit = RAMO_ALIAS.find(([re]) => re.test(norm(ramo)));
    if (hit) ramo = hit[1];
  }

  const monedaN = norm(r.moneda);
  let moneda = buscarOpcion(r.moneda, o.MONEDAS);
  if (!moneda) {
    if (/^(mxn|mn|peso|pesos|m n)$/.test(monedaN)) moneda = "MXN";
    else if (/^(usd|dolar|dolares|dls)$/.test(monedaN)) moneda = "DÓLARES";
    else moneda = monedaN ? "OTRO" : "MXN";
  }

  let pago = buscarOpcion(r.pagoFraccionado, o.PAGOS);
  let metodo = buscarOpcion(r.metodoPago, o.METODOS);
  if (r.formaPago) {
    const comoFracc = buscarOpcion(r.formaPago, o.PAGOS);
    if (comoFracc) { if (!pago) pago = comoFracc; }
    else if (!metodo) metodo = buscarOpcion(r.formaPago, o.METODOS);
  }
  if (!metodo) metodo = "Otro";

  return {
    aseguradora: asegCanon,
    ramo,
    numeroPoliza: txt(r.numeroPoliza),
    primaAnual: r.primaAnual === "" || r.primaAnual === null ? "" : String(r.primaAnual),
    pagoFraccionado: pago,
    metodoPago: metodo,
    moneda,
    clasificacion: buscarOpcion(r.clasificacion, o.CLASIFICACIONES) || "Nueva",
    inicioVigencia: r.inicioVigencia || "",
    finVigencia: r.finVigencia || "",
    fechaAlta: r.fechaAlta || "",
    fechaPago: r.fechaPago || "",
    // Si no viene la fecha de renovación, se usa el fin de vigencia (así salen los recordatorios).
    fechaRenovacion: r.fechaRenovacion || r.finVigencia || "",
    documento: null,
  };
}

function claveCliente(nombre, telefono) {
  const t = digits(telefono);
  if (t.length >= 7) return "t:" + t.slice(-10);
  return "n:" + norm(nombre);
}

// Encuentra la fila de encabezados (las primeras 12 filas) y arma el mapa columna -> campo.
function leerHoja(ws) {
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  let hdrIdx = -1, mapa = null, mejor = 0;
  for (let i = 0; i < Math.min(filas.length, 12); i++) {
    const m = {};
    let n = 0;
    (filas[i] || []).forEach((celda, c) => {
      const campo = ALIAS_LOOKUP[norm(celda)];
      if (campo && !Object.values(m).includes(campo)) { m[c] = campo; n++; }
    });
    if (n > mejor) { mejor = n; hdrIdx = i; mapa = m; }
  }
  if (!mapa || mejor < 2 || !Object.values(mapa).includes("nombre")) return { registros: [], encabezados: false };
  const registros = [];
  for (let i = hdrIdx + 1; i < filas.length; i++) {
    const fila = filas[i] || [];
    if (fila.every((c) => c === "" || c === null)) continue;
    const rec = { _fila: i + 1 };
    Object.entries(mapa).forEach(([c, campo]) => { rec[campo] = fila[c] === undefined ? "" : fila[c]; });
    registros.push(rec);
  }
  return { registros, encabezados: true };
}

export async function leerArchivo(file) {
  const nombre = (file.name || "").toLowerCase();
  if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) {
    const texto = await file.text();
    return XLSX.read(texto, { type: "string", raw: true }); // raw: no adivinar fechas ni números (dd/mm/aaaa, teléfonos)
  }
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}

// Analiza el libro y calcula qué se importaría frente a la cartera actual. No modifica nada.
export function analizarCartera(wb, clientesActuales, opciones) {
  const advertencias = [];
  const omitidas = [];

  const hojas = wb.SheetNames.map((n) => ({ nombre: n, ...leerHoja(wb.Sheets[n]) })).filter((h) => h.encabezados);
  if (!hojas.length) {
    return { error: "No encontré encabezados reconocibles. Descarga la plantilla y copia tus datos ahí (debe haber al menos las columnas Nombre y Teléfono)." };
  }
  const hojaPol = hojas.find((h) => norm(h.nombre) === "polizas") || null;
  const hojaCli = hojas.find((h) => norm(h.nombre) === "clientes") || null;
  const principal = hojaPol || hojas[0];
  const extra = hojaPol && hojaCli ? hojaCli : null;

  // 1) Agrupar filas por cliente
  const grupos = new Map();
  let sinTelefono = 0, fechasInvalidas = 0, primasInvalidas = 0;

  function procesa(rec, soloCliente) {
    const nombre = txt(rec.nombre);
    if (!nombre) { omitidas.push({ fila: rec._fila, motivo: "sin nombre" }); return; }
    if (norm(nombre).startsWith("ejemplo")) return; // filas de ejemplo de la plantilla
    const key = claveCliente(nombre, rec.telefono);
    let g = grupos.get(key);
    if (!g) {
      g = { key, nombre, telefono: txt(rec.telefono), correo: "", requiereFactura: false, fechaCumple: "", polizas: [], filas: [] };
      grupos.set(key, g);
      if (digits(rec.telefono).length < 7) sinTelefono++;
    }
    g.filas.push(rec._fila);
    if (!g.correo && txt(rec.correo)) g.correo = txt(rec.correo);
    if (!g.telefono && txt(rec.telefono)) g.telefono = txt(rec.telefono);
    if (norm(rec.requiereFactura).match(/^(si|s|true|1|x|yes)$/)) g.requiereFactura = true;
    if (!g.fechaCumple && rec.fechaCumple !== "" && rec.fechaCumple !== undefined) {
      const f = parseFecha(rec.fechaCumple);
      if (f === null) fechasInvalidas++; else g.fechaCumple = f;
    }
    if (soloCliente) return;
    if (!CAMPOS_POLIZA.some((c) => txt(rec[c]) !== "")) return; // fila solo con datos del cliente

    const r = { ...rec };
    for (const campo of ["inicioVigencia", "finVigencia", "fechaAlta", "fechaPago", "fechaRenovacion"]) {
      const f = parseFecha(rec[campo]);
      if (f === null) { fechasInvalidas++; r[campo] = ""; } else r[campo] = f;
    }
    const prima = parseNumero(rec.primaAnual);
    if (prima === null) { primasInvalidas++; r.primaAnual = ""; } else r.primaAnual = prima;
    g.polizas.push(normalizaPoliza(r, opciones));
  }

  principal.registros.forEach((rec) => procesa(rec, false));
  if (extra) extra.registros.forEach((rec) => procesa(rec, true));

  // 2) Comparar con la cartera actual
  const porTel = new Map(), porNombre = new Map();
  clientesActuales.forEach((c) => {
    const t = digits(c.telefono);
    if (t.length >= 7) porTel.set(t.slice(-10), c);
    porNombre.set(norm(c.nombre), c);
  });
  const llavePol = (p) => (p.numeroPoliza ? "n:" + norm(p.numeroPoliza) : ["x", norm(p.aseguradora), norm(p.ramo), p.inicioVigencia, p.finVigencia, p.primaAnual].join("|"));

  const nuevos = [], existentes = [];
  let polizasNuevas = 0, polizasDuplicadas = 0;
  grupos.forEach((g) => {
    const t = digits(g.telefono);
    const actual = (t.length >= 7 && porTel.get(t.slice(-10))) || porNombre.get(norm(g.nombre)) || null;
    if (!actual) {
      nuevos.push(g);
      polizasNuevas += g.polizas.length;
      return;
    }
    const llaves = new Set((actual.polizas || []).map(llavePol));
    const aAgregar = [];
    g.polizas.forEach((p) => {
      const k = llavePol(p);
      if (llaves.has(k)) polizasDuplicadas++;
      else { llaves.add(k); aAgregar.push(p); }
    });
    polizasNuevas += aAgregar.length;
    existentes.push({ id: actual.id, nombre: actual.nombre, grupo: g, aAgregar });
  });

  if (sinTelefono) advertencias.push(`${sinTelefono} cliente${sinTelefono === 1 ? "" : "s"} sin teléfono válido (no podrás enviarles WhatsApp hasta capturarlo).`);
  if (fechasInvalidas) advertencias.push(fechasInvalidas === 1 ? "1 fecha no se entendió y se dejó vacía. Usa dd/mm/aaaa." : `${fechasInvalidas} fechas no se entendieron y se dejaron vacías. Usa dd/mm/aaaa.`);
  if (primasInvalidas) advertencias.push(primasInvalidas === 1 ? "1 prima no es un número y se dejó vacía." : `${primasInvalidas} primas no son un número y se dejaron vacías.`);
  const sinPrima = nuevos.concat(existentes.map((e) => ({ polizas: e.aAgregar }))).reduce((n, g) => n + g.polizas.filter((p) => p.primaAnual === "").length, 0);
  if (sinPrima) advertencias.push(`${sinPrima} póliza${sinPrima === 1 ? "" : "s"} sin prima anual: no sumarán en Comisiones hasta que la captures.`);

  // 3) Función que aplica el resultado sobre la lista de clientes (se usa dentro de setClients)
  function aplicar(cs) {
    const base = Date.now();
    let n = 0;
    const id = () => String(base + n++);
    const copia = cs.map((c) => {
      const e = existentes.find((x) => x.id === c.id);
      if (!e) return c;
      return {
        ...c,
        correo: c.correo || e.grupo.correo || "",
        fechaCumple: c.fechaCumple || e.grupo.fechaCumple || "",
        polizas: [...(c.polizas || []), ...e.aAgregar.map((p) => ({ ...p, id: id() }))],
      };
    });
    const creados = nuevos.map((g) => ({
      id: id(),
      nombre: g.nombre,
      telefono: g.telefono,
      correo: g.correo,
      requiereFactura: g.requiereFactura,
      fechaCumple: g.fechaCumple,
      polizas: g.polizas.map((p) => ({ ...p, id: id() })),
    }));
    return [...copia, ...creados];
  }

  return {
    clientesNuevos: nuevos.length,
    clientesExistentes: existentes.filter((e) => e.aAgregar.length).length,
    polizasNuevas,
    polizasDuplicadas,
    omitidas,
    advertencias,
    vista: nuevos.slice(0, 6).map((g) => ({ nombre: g.nombre, telefono: g.telefono, polizas: g.polizas.length })),
    hayAlgo: nuevos.length > 0 || existentes.some((e) => e.aAgregar.length > 0),
    aplicar,
  };
}

export function descargarPlantilla(opciones) {
  const wb = XLSX.utils.book_new();
  const encabezados = [
    "Nombre", "Teléfono", "Correo", "Cumpleaños", "Requiere factura",
    "Aseguradora", "Ramo", "Número de póliza", "Prima anual", "Moneda", "Pago fraccionado", "Método de pago", "Clasificación",
    "Inicio de vigencia", "Fin de vigencia", "Fecha de contratación", "Fecha de pago", "Fecha de renovación",
  ];
  const ejemplo = [
    "Ejemplo: María López (borra esta fila)", "5212221234567", "maria@correo.com", "15/03/1985", "No",
    "GNP", "Autos", "ABC123456", 12500, "MXN", "Mensual", "Tarjeta de crédito", "Nueva",
    "01/02/2026", "01/02/2027", "01/02/2026", "01/11/2026", "01/02/2027",
  ];
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ejemplo]);
  ws["!cols"] = encabezados.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, "Cartera");

  const ayuda = [
    ["Cómo llenar la plantilla"],
    ["• Una fila por póliza. Si un cliente tiene 2 pólizas, repite su nombre y teléfono en dos filas."],
    ["• Obligatorio: Nombre. Muy recomendado: Teléfono con lada (ej. 5212221234567) para WhatsApp."],
    ["• Fechas en formato dd/mm/aaaa."],
    ["• Si no pones Fecha de renovación, se usa el Fin de vigencia."],
    ["• Si el cliente (mismo teléfono o nombre) ya existe, solo se agregan las pólizas nuevas; no se duplica nada."],
    ["• Borra la fila de ejemplo antes de importar (si la dejas, se omite sola)."],
    [""],
    ["Valores sugeridos"],
    ["Aseguradora", opciones.ASEGURADORAS.filter((a) => a !== "Otra").join(", ")],
    ["Ramo", opciones.RAMOS.filter((a) => a !== "Otro").join(", ")],
    ["Moneda", opciones.MONEDAS.join(", ")],
    ["Pago fraccionado", opciones.PAGOS.join(", ")],
    ["Método de pago", opciones.METODOS.join(", ")],
    ["Clasificación", opciones.CLASIFICACIONES.join(", ")],
  ];
  const wa = XLSX.utils.aoa_to_sheet(ayuda);
  wa["!cols"] = [{ wch: 22 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wa, "Instrucciones");
  XLSX.writeFile(wb, "plantilla-cartera.xlsx");
}
