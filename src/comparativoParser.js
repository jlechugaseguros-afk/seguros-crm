// Lógica pura del Comparativo: lee el texto de una póliza/cotización y arma las filas de la tabla.
// No depende de React ni del navegador, así se puede probar aparte.

export const MAX_POLIZAS = 4;

const ASEGURADORAS = [
  ["Qualitas", /qu[aá]litas/i],
  ["GNP", /\bgnp\b/i],
  ["AXA", /\baxa\b/i],
  ["Banorte", /banorte/i],
  ["Afirme", /afirme/i],
  ["HDI", /\bhdi\b/i],
  ["Mapfre", /mapfre/i],
  ["Zurich", /zurich/i],
  ["ANA", /\bana seguros\b|\bana compa/i],
  ["Chubb", /chubb/i],
  ["Atlas", /seguros atlas/i],
  ["Inbursa", /inbursa/i],
  ["Latino Seguros", /latino seguros/i],
  ["Plan Seguro", /plan seguro/i],
  ["GMX", /\bgmx\b/i],
  ["El Águila", /el [aá]guila/i],
  ["Seguros Monterrey", /seguros monterrey|new york life/i],
  ["Allianz", /allianz/i],
  ["MetLife", /metlife/i],
  ["Crabi", /crabi/i],
  ["Clupp", /clupp/i],
];

// Coberturas de Autos (la lista más común). Cada una: clave, nombre en la tabla y patrón para encontrarla.
const COBERTURAS_AUTOS = [
  ["valor", "Valor del vehículo / suma asegurada", /valor (?:del veh[ií]culo|comercial|convenido|factura)|suma asegurada del veh/i],
  ["danos", "Daños materiales", /da[ñn]os materiales/i],
  ["robo", "Robo total", /robo total/i],
  ["gmo", "Gastos médicos ocupantes", /gastos m[eé]dicos (?:a )?ocupantes|gastos m[eé]dicos\b/i],
  ["rc", "Responsabilidad civil (daños a terceros)", /responsabilidad civil(?! en el extranjero)|rc (?:por )?da[ñn]os a terceros|da[ñn]os a terceros/i],
  ["accidentes", "Accidentes al conductor", /accidentes? (?:automovil[ií]sticos? )?(?:al|del) conductor|muerte accidental del conductor/i],
  ["asistencia", "Asistencia vial", /asistencia (?:vial|en viajes|legal y vial)|asistencia/i],
  ["legales", "Gastos legales", /gastos legales|defensa jur[ií]dica|asistencia jur[ií]dica/i],
  ["rcext", "RC en el extranjero", /(?:rc|responsabilidad civil) en el extranjero|extensi[oó]n de responsabilidad civil/i],
  ["cristales", "Rotura de cristales", /rotura de cristales|cristales/i],
];

const MONEY = /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$\s?\d+(?:\.\d{1,2})?/g;
const PERCENT = /\d{1,3}(?:\.\d+)?\s?%/g;
const PALABRAS = /valor comercial|valor convenido|comercial|convenido|amparad[ao]|incluid[ao]|ilimitad[ao]|valor factura|factura/i;

export function parseMoney(str) {
  if (!str) return null;
  const m = String(str).match(/\$?\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(n) {
  return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function norm(s) {
  return s.replace(/\s+/g, " ").trim();
}

function amountsIn(line) {
  return (line.match(MONEY) || []).map((a) => a.replace(/\s/g, ""));
}

// Cantidad que sigue a una palabra "Total" en la línea (p. ej. "1 × $1,828 11 × $1,016 Total $13,006.80")
function totalIn(line) {
  const m = line.match(/total[:\s]*(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i);
  return m ? m[1].replace(/\s/g, "") : null;
}

// Busca una línea que coincida y devuelve ella + la siguiente (por si el valor quedó en la línea de abajo).
function findLine(lines, re) {
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return { line: lines[i], next: lines[i + 1] || "", prev: lines[i - 1] || "", index: i };
  }
  return null;
}

function detectAseguradora(text, fileName) {
  for (const [name, re] of ASEGURADORAS) if (re.test(text)) return name;
  for (const [name, re] of ASEGURADORAS) if (re.test(fileName)) return name;
  return "";
}

function detectRamo(text) {
  if (/da[ñn]os materiales|robo total|responsabilidad civil|cobertura amplia|veh[ií]culo/i.test(text)) return "Autos";
  if (/gastos m[eé]dicos mayores|coaseguro|hospitales/i.test(text)) return "Gastos Médicos Mayores";
  if (/seguro de vida|suma asegurada por fallecimiento|fallecimiento/i.test(text)) return "Vida";
  if (/hogar|casa habitaci[oó]n/i.test(text)) return "Hogar";
  return "";
}

function detectVigencia(text) {
  const d = "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})";
  const m = text.match(new RegExp(`vigencia[^\\d]{0,40}${d}[^\\d]{1,25}${d}`, "i"))
    || text.match(new RegExp(`${d}\\s*(?:al|a|hasta)\\s*${d}`, "i"));
  return m ? `${m[1]} al ${m[2]}` : "";
}

function detectVehiculo(lines) {
  const hit = findLine(lines, /^(?:descripci[oó]n|veh[ií]culo|marca y modelo|unidad)\b[\s:]/i);
  if (hit) {
    const v = norm(hit.line.replace(/^(?:descripci[oó]n|veh[ií]culo|marca y modelo|unidad)\b[\s:]*/i, ""));
    if (v) return v;
  }
  return "";
}

function detectNumero(text) {
  const m = text.match(/(?:n[uú]mero de p[oó]liza|p[oó]liza|cotizaci[oó]n|folio)\s*(?:no\.?|n[uú]m\.?|#|:)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,})/i);
  return m ? m[1] : "";
}

// Costos: prima total, contado y pagos fraccionados
function parseCostos(lines) {
  const out = { total: "", contado: "", semestral: "", trimestral: "", mensual: "" };

  const pick = (re) => {
    const hit = findLine(lines, re);
    if (!hit) return "";
    const i = hit.index;
    // Se prefiere el "Total" del plan de pago (en la misma línea o en las 2 siguientes)
    const total = totalIn(lines[i]) || totalIn(lines[i + 1] || "") || totalIn(lines[i + 2] || "");
    if (total) return total;
    return amountsIn(lines[i])[0] || amountsIn(lines[i + 1] || "")[0] || "";
  };

  out.total = pick(/prima total|total a pagar|importe total|precio total|prima anual total|costo total/i);
  out.contado = pick(/\bcontado\b|pago [uú]nico|pago anual|\banual\b(?!idad)/i);
  out.semestral = pick(/semestral/i);
  out.trimestral = pick(/trimestral/i);
  out.mensual = pick(/mensual(?!idad)/i);

  // Si solo hay una cifra clara de total o de contado, se usa para ambas filas "comparables"
  if (!out.total && out.contado) out.total = out.contado;
  if (!out.contado && out.total) out.contado = out.total;
  return out;
}

function parseCobertura(lines, re, keepMatch = false) {
  const hit = findLine(lines, re);
  if (!hit) return { found: false, suma: "", deducible: "" };

  const grab = (s) => {
    const resto = keepMatch ? s : s.replace(re, " ");
    const dinero = amountsIn(resto);
    const pct = (resto.match(PERCENT) || []).map((p) => p.replace(/\s/g, ""));
    const palabra = (resto.match(PALABRAS) || [""])[0];
    return { dinero, pct, palabra };
  };

  let g = grab(hit.line);
  if (!g.dinero.length && !g.pct.length && !g.palabra) g = grab(hit.next);

  const suma = g.dinero[0] || (g.palabra ? g.palabra.charAt(0).toUpperCase() + g.palabra.slice(1).toLowerCase() : "");
  // Solo se toma como deducible un porcentaje, o un monto que venga después de la palabra "deducible"
  const mDed = (hit.line + " " + hit.next).match(/deducible[:\s]*(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i);
  const deducible = g.pct[0] || (mDed ? mDed[1].replace(/\s/g, "") : "");
  return { found: true, suma, deducible };
}

function celdaCobertura(c) {
  if (!c.found) return "—";
  if (c.suma && c.deducible) return `${c.suma} · Ded. ${c.deducible}`;
  if (c.suma) return c.suma;
  if (c.deducible) return `Ded. ${c.deducible}`;
  return "Incluida";
}

// Une las líneas de texto de un PDF (ya agrupadas por renglón) en un objeto de póliza.
export function parsePoliza(lines, fileName) {
  const limpias = lines.map(norm).filter(Boolean);
  const text = limpias.join("\n");
  const costos = parseCostos(limpias);
  const coberturas = {};
  for (const [key, , re] of COBERTURAS_AUTOS) coberturas[key] = parseCobertura(limpias, re, key === "valor");

  return {
    archivo: fileName,
    sinTexto: limpias.length === 0,
    aseguradora: detectAseguradora(text, fileName),
    ramo: detectRamo(text),
    vehiculo: detectVehiculo(limpias),
    vigencia: detectVigencia(text),
    numero: detectNumero(text),
    costos,
    coberturas: Object.fromEntries(Object.entries(coberturas).map(([k, c]) => [k, celdaCobertura(c)])),
  };
}

// Construye la tabla comparativa (secciones con filas editables) a partir de 1 a 4 pólizas.
export function construirTabla(polizas) {
  const vals = (fn) => polizas.map(fn);
  const fila = (id, label, values) => ({ id, label, values });

  const secciones = [
    {
      id: "datos",
      title: "Datos de la póliza",
      rows: [
        fila("aseguradora", "Aseguradora", vals((p) => p.aseguradora || "—")),
        fila("ramo", "Ramo", vals((p) => p.ramo || "—")),
        fila("vehiculo", "Vehículo / bien asegurado", vals((p) => p.vehiculo || "—")),
        fila("vigencia", "Vigencia", vals((p) => p.vigencia || "—")),
        fila("numero", "Póliza / cotización", vals((p) => p.numero || "—")),
      ],
    },
    {
      id: "costos",
      title: "Costos",
      rows: [
        fila("c-total", "Prima total anual", vals((p) => p.costos.total || "—")),
        fila("c-mensual", "Pago mensual", vals((p) => p.costos.mensual || "—")),
        fila("c-trimestral", "Pago trimestral", vals((p) => p.costos.trimestral || "—")),
        fila("c-semestral", "Pago semestral", vals((p) => p.costos.semestral || "—")),
        fila("c-contado", "Pago de contado", vals((p) => p.costos.contado || "—")),
      ],
    },
    {
      id: "coberturas",
      title: "Coberturas (suma asegurada · deducible)",
      rows: COBERTURAS_AUTOS.map(([key, label]) => fila(`k-${key}`, label, vals((p) => p.coberturas[key] || "—"))),
    },
  ];
  return secciones;
}

// Índices de las celdas con el precio más bajo en una fila de costos (para resaltar la mejor opción).
export function indiceMasBarato(values) {
  let best = null;
  let idx = [];
  values.forEach((v, i) => {
    const n = parseMoney(v);
    if (n === null) return;
    if (best === null || n < best) { best = n; idx = [i]; }
    else if (n === best) idx.push(i);
  });
  return values.length > 1 && idx.length < values.filter((v) => parseMoney(v) !== null).length ? idx : [];
}
