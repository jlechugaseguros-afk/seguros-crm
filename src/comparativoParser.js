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
  ["ANA", /\bana (?:seguros|compa|asistencia)/i],
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
  ["accidentes", "Accidentes al conductor", /accidentes? (?:automovil[ií]sticos? )?(?:al|del) conductor|muerte accidental del conductor|muerte del conductor/i],
  ["asistencia", "Asistencia vial", /asistencia (?:vial|en viajes|legal y vial)|asistencia/i],
  ["legales", "Gastos legales", /gastos legales|defensa jur[ií]dica|asistencia jur[ií]dica|protecci[oó]n legal/i],
  ["rcext", "RC en el extranjero", /(?:rc|responsabilidad civil) en el extranjero|extensi[oó]n de responsabilidad civil/i],
  ["cristales", "Rotura de cristales", /rotura de cristales|cristales/i],
  ["extension", "Extensión de RC", /extensi[oó]n (?:de )?(?:rc|responsabilidad)/i],
  ["rcocup", "RC ocupantes", /responsabilidad civil ocupantes|rc ocupantes/i],
  ["desbiela", "Desbielamiento por agua", /desbielamiento/i],
  ["multas", "Multas y corralones", /multas y corralones/i],
];
// Coberturas que solo se muestran si traen un valor claro (para no marcar "Incluida" por una simple nota)
const SOLO_CON_VALOR = new Set(["rcext", "extension", "rcocup", "desbiela", "multas"]);

const BARE = /\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?/;
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

const NUM_RE = /\$?\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$\s?\d+(?:\.\d{1,2})?/g;
const money$ = (a) => { const t = String(a).replace(/[\s$]/g, ""); return t ? `$${t}` : ""; };
const numVal = (a) => Number(String(a).replace(/[^\d.]/g, "")) || 0;
const todasEtiquetas = COBERTURAS_AUTOS.map(([, , re]) => re);

// Formato "tabla de riesgos" (ANA, Qualitas): RIESGO | SUMA ASEGURADA | DEDUCIBLE | PRIMAS en una sola línea.
function coberturaTabla(lines, key, re) {
  const hit = findLine(lines, re);
  if (!hit) return { found: false };
  const resto = hit.line.replace(re, " ");
  const amounts = resto.match(NUM_RE) || [];
  const pct = (resto.match(PERCENT) || [])[0];
  let suma = "";
  if (amounts.length >= 2) suma = money$(amounts[0]);
  else if (amounts.length === 1 && !/\$/.test(amounts[0])) suma = money$(amounts[0]);
  if (key === "multas") { const u = resto.match(/(\d{1,3})\s*\*+/); if (u) suma = `${u[1]} UMAs`; }
  if (!suma && (/amparad/i.test(hit.line) || amounts.length)) suma = "Amparada";
  return { found: true, suma, deducible: pct ? pct.replace(/\s/g, "") : "" };
}

// Formato GNP: la suma y el deducible vienen en líneas contiguas y el deducible suele ser un monto.
function coberturaGNP(lines, key, re) {
  const hit = findLine(lines, re);
  if (!hit) return { found: false };
  let texto = lines[hit.index].replace(re, " ");
  for (let j = 1; j <= 3; j++) {
    const l = lines[hit.index + j];
    if (l === undefined || todasEtiquetas.some((r) => r.test(l)) || /^beneficios/i.test(l)) break;
    texto += " " + l;
  }
  const amounts = texto.match(NUM_RE) || [];
  const pct = (texto.match(PERCENT) || [])[0];
  let suma = ""; let ded = pct ? pct.replace(/\s/g, "") : "";
  if (amounts.length) {
    const sorted = [...amounts].sort((a, b) => numVal(b) - numVal(a));
    suma = money$(sorted[0]);
    if (amounts.length >= 2 && !ded) {
      const d = numVal(sorted[sorted.length - 1]); const base = numVal(sorted[0]);
      const p = base ? Math.round((d / base) * 1000) / 10 : 0;
      ded = `${p}% (${money$(sorted[sorted.length - 1])})`;
    }
  }
  if (!suma && /amparad/i.test(texto)) suma = "Amparada";
  return { found: true, suma, deducible: ded };
}

function celdaCobertura(c) {
  if (!c.found) return "—";
  if (c.suma && c.deducible) return `${c.suma} · Ded. ${c.deducible}`;
  if (c.suma) return c.suma;
  if (c.deducible) return `Ded. ${c.deducible}`;
  return "Incluida";
}

const MESES = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12" };
const num2 = (t) => (t ? `$${t}` : "");
const fmtMx = (n) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PAGOS_POR_ANIO = { semestral: 2, trimestral: 4, mensual: 12, bimestral: 6 };

// Datos que dependen del formato de cada cotización (vehículo, vigencia, número de cotización, plan).
function datosPorFormato(lines, text, estilo) {
  const out = {};
  if (estilo === "tabla") {
    const mod = text.match(/modelo\s*:?\s*(\d{4})/i);
    const veh = findLine(lines, /^veh[ií]culo\s*:/i);
    if (veh) out.vehiculo = norm(veh.line.replace(/^veh[ií]culo\s*:\s*/i, "")) + (mod ? ` ${mod[1]}` : "");
    const dv = findLine(lines, /descripci[oó]n del veh[ií]culo/i);
    if (dv && lines[dv.index + 1]) {
      out.vehiculo = norm(lines[dv.index + 1].replace(/^\d{3,6}\s+/, "")) + (mod ? ` ${mod[1]}` : "");
    }
    const m = text.match(/(?:desde|del)[^\n]{0,30}?(\d{2})\/([A-Za-z]{3})\/(\d{4})[\s\S]{0,80}?hasta[^\n]{0,30}?(\d{2})\/([A-Za-z]{3})\/(\d{4})/i);
    if (m) {
      const mm = (x) => MESES[x.toLowerCase()] || x;
      out.vigencia = `${m[1]}/${mm(m[2])}/${m[3]} al ${m[4]}/${mm(m[5])}/${m[6]}`;
    }
    const nq = text.match(/^(\d{7,})\s+([A-ZÁÉÍÓÚ]+)\s/m);
    if (nq) { out.numero = nq[1]; out.plan = nq[2].charAt(0) + nq[2].slice(1).toLowerCase(); }
    const pl = text.match(/plan cobertura\s*:\s*([A-Za-zÁÉÍÓÚ]+)/i);
    if (pl) out.plan = pl[1].charAt(0).toUpperCase() + pl[1].slice(1).toLowerCase();
  }
  if (estilo === "gnp") {
    const v = text.match(/(?:femenino|masculino)\s+(.+)/i);
    if (v) out.vehiculo = norm(v[1]).replace(/^([A-ZÁÉÍÓÚ]+),\s*\1\s/, "$1 ");
    const mo = text.match(/\b(20\d{2})\b\s+veh[ií]culos|\bModelo\b[^\n]*\n[^\n]*?\b(20\d{2})\b/i);
    const f = text.match(/folio de cotizaci[oó]n:\s*([A-Z0-9]+)/i);
    if (f) out.numero = f[1];
    const fe = text.match(/fecha de cotizaci[oó]n:\s*(\d{1,2} [a-záéíóú]+ \d{4})/i);
    const dias = text.match(/vigencia de (\d+) d[ií]as/i);
    if (fe) out.vigencia = `Cotizado el ${fe[1]}${dias ? ` (válida ${dias[1]} días)` : ""}`;
    const pq = text.match(/^(Amplia|Limitada|RC|Plus|B[aá]sica)\b.*pago/im) || text.match(/DETALLE DE COBERTURAS\n([A-Za-záéíóú ]+)\n/);
    if (pq) out.plan = pq[1].trim();
    if (mo && out.vehiculo) { const y = mo[1] || mo[2]; if (y && !out.vehiculo.includes(y)) out.vehiculo += ` ${y}`; }
  }
  return out;
}

// Costos que dependen del formato (prima neta, pagos fraccionados con su suma total).
function costosFormato(lines, text, estilo) {
  const out = {};
  if (estilo === "tabla") {
    const grab = (re) => { const m = text.match(re); return m ? m[1] : ""; };
    const neta = grab(/prima neta\s*:?\s*\$?\s?([\d,]+\.\d{2})/i);
    if (neta) out.neta = num2(neta);
    const total = grab(/(?:importe total|prima total)\s*:?\s*\$?\s?([\d,]+\.\d{2})/i);
    const forma = (text.match(/forma de pago\s*:\s*([A-Za-zÁÉÍÓÚ]+)/i) || [])[1] || "";
    let contado = "";
    for (const l of lines) {
      const m = l.match(/^(contado|semestral|trimestral|mensual|bimestral)\s+\$?\s?([\d,]+\.\d{2})(?:\s+\$?\s?([\d,]+\.\d{2}))?/i);
      if (!m) continue;
      const k = m[1].toLowerCase();
      if (k === "contado") { contado = m[2]; out.contado = num2(m[2]); continue; }
      const n = PAGOS_POR_ANIO[k];
      const ini = numVal(m[2]); const sub = m[3] ? numVal(m[3]) : 0;
      if (n && sub) out[k] = `${fmtMx(ini + sub * (n - 1))} (1 × ${fmtMx(ini)} + ${n - 1} × ${fmtMx(sub)})`;
    }
    const t = total || contado;
    if (t) { out.total = num2(t); if (!out.contado && /contado/i.test(forma || "contado")) out.contado = num2(t); }
  }
  if (estilo === "gnp") {
    const m = text.match(/(\d+)\s+pagos?\s+de\s+\$\s?([\d,]+(?:\.\d+)?)\s+\$\s?([\d,]+(?:\.\d+)?)/i);
    if (m) {
      const n = Number(m[1]); const total = `$${m[3]}`;
      out.total = total;
      if (n === 1) out.contado = total;
      else {
        const k = { 2: "semestral", 4: "trimestral", 12: "mensual", 6: "bimestral" }[n];
        if (k) out[k] = `${total} (${n} × $${m[2]})`;
      }
    }
  }
  return out;
}

// Une las líneas de texto de un PDF (ya agrupadas por renglón) en un objeto de póliza.
export function parsePoliza(lines, fileName) {
  const limpias = lines.map(norm).filter(Boolean);
  const text = limpias.join("\n");
  const costos = parseCostos(limpias);
  const coberturas = {};
  const aseguradora = detectAseguradora(text, fileName);
  const estilo = /suma asegurada\s+deducible\s+primas/i.test(text) ? "tabla" : (aseguradora === "GNP" && /detalle de coberturas/i.test(text) ? "gnp" : "generico");
  for (const [key, , re] of COBERTURAS_AUTOS) {
    let c = estilo === "tabla" ? coberturaTabla(limpias, key, re) : estilo === "gnp" ? coberturaGNP(limpias, key, re) : parseCobertura(limpias, re, key === "valor");
    if (c.found && SOLO_CON_VALOR.has(key) && !c.suma && !c.deducible) c = { found: false };
    coberturas[key] = c;
  }
  // Si no hay "valor del vehículo", se usa la suma asegurada de daños materiales (valor comercial)
  if (!coberturas.valor.found && coberturas.danos.found && coberturas.danos.suma && /\d/.test(coberturas.danos.suma)) {
    coberturas.valor = { found: true, suma: coberturas.danos.suma, deducible: "" };
  }
  const datosFormato = datosPorFormato(limpias, text, estilo);

  return {
    archivo: fileName,
    sinTexto: limpias.length === 0,
    aseguradora,
    ramo: detectRamo(text),
    vehiculo: datosFormato.vehiculo || detectVehiculo(limpias),
    vigencia: datosFormato.vigencia || detectVigencia(text),
    numero: datosFormato.numero || (estilo === "generico" ? detectNumero(text) : ""),
    plan: datosFormato.plan || "",
    costos: { ...costos, ...costosFormato(limpias, text, estilo, costos) },
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
        fila("plan", "Plan / paquete", vals((p) => p.plan || "—")),
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
        fila("c-neta", "Prima neta (sin derechos ni IVA)", vals((p) => p.costos.neta || "—")),
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
