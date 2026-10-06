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
  ["danos", "Daños materiales", /da[ñn]os materiales(?!.*p[eé]rdida total)/i],
  ["robo", "Robo total", /robo total/i],
  ["gmo", "Gastos médicos ocupantes", /gastos m[eé]dicos (?:a )?ocupantes|gastos m[eé]dicos\b/i],
  ["rc", "Responsabilidad civil (daños a terceros)", /(?<!extensi[oó]n de )responsabilidad civil(?! (?:en|familiar|ocupantes|bienes|personas|exceso|extranjero))|rc (?:por )?da[ñn]os a terceros|da[ñn]os a terceros/i],
  ["accidentes", "Accidentes al conductor", /accidentes? (?:automovil[ií]sticos? )?(?:al|del) conductor|muerte accidental del conductor|muerte del conductor|accidentes automovil[ií]sticos(?: al)?$/i],
  ["asistencia", "Asistencia vial", /asistencia (?:vial|en viajes?|y vial)|servicios de asistencia/i],
  ["legales", "Gastos legales", /gastos legales|defensa (?:jur[ií]dica|legal)|asistencia (?:jur[ií]dica|legal)(?! y vial)|protecci[oó]n legal/i],
  ["rcext", "RC en el extranjero", /(?:rc|responsabilidad civil) en (?:el extranjero|usa)|(?:rc|responsabilidad civil) extranjero/i],
  ["cristales", "Rotura de cristales", /rotura de cristales|cristales/i],
  ["extension", "Extensión de RC", /extensi[oó]n (?:de )?(?:cobertura de )?(?:rc|responsabilidad)/i],
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
const money$ = (a) => { const t = String(a).replace(/[\s$]/g, "").replace(/\.00$/, ""); return t ? `$${t}` : ""; };
const numVal = (a) => Number(String(a).replace(/[^\d.]/g, "")) || 0;
const todasEtiquetas = COBERTURAS_AUTOS.map(([, , re]) => re);

// Formato "tabla de coberturas" (ANA, Qualitas, AXA, Afirme, HDI, Chubb, Zurich): cada cobertura en una línea con suma asegurada
// y deducible (algunas con columna de primas). Si el valor se partió en líneas, se mira hasta 3 renglones abajo.
const TOKEN_DED = /\d+(?:\.\d+)?\s?%|NO APLICA|NINGUNO|POR EVENTO|\bUMA\b/i;
function coberturaTabla(lines, key, re, conPrima) {
  if (key === "valor") return { found: false };
  const hit = findLine(lines, re);
  if (!hit) return { found: false };
  const lee = (t) => {
    const resto = t.replace(re, " ");
    const amounts = resto.match(NUM_RE) || [];
    const pct = (resto.match(PERCENT) || [])[0];
    const palabra = (resto.match(/valor comercial|valor convenido|valor factura/i) || [])[0];
    const amparada = /amparad|otorgada/i.test(resto);
    return { resto, amounts, pct, palabra, amparada };
  };
  let r = lee(hit.line);
  let texto = hit.line;
  if (!r.amounts.length && !r.pct && !r.palabra && !r.amparada) {
    for (let j = 1; j <= 3; j++) {
      const l = lines[hit.index + j];
      if (l === undefined || todasEtiquetas.some((x) => x.test(l))) break;
      texto += " " + l;
    }
    r = lee(texto);
  }
  let suma = "";
  if (r.amounts.length) {
    const tok = r.resto.search(TOKEN_DED);
    if (!conPrima) suma = money$(r.amounts[0]);
    else if (tok >= 0) { const antes = r.amounts.find((a) => r.resto.indexOf(a) < tok); if (antes) suma = money$(antes); }
    else if (r.amounts.length >= 2) suma = money$(r.amounts[0]);
    else if (!/\$/.test(r.amounts[0])) suma = money$(r.amounts[0]);
  }
  if (key === "multas") { const u = r.resto.match(/(\d{1,3}(?:\.\d+)?)\s*(?:\*+|UMAs?\b)/i); if (u) suma = `${Number(u[1])} UMAs`; }
  if (!suma && r.palabra) suma = "Valor comercial";
  if (!suma && (r.amparada || r.amounts.length)) suma = "Amparada";
  return { found: true, suma, deducible: r.pct ? r.pct.replace(/\s/g, "").replace(/\.0+%/, "%") : "" };
}

// Formato GNP: la suma y el deducible vienen en líneas contiguas y el deducible suele ser un monto.
function coberturaGNP(lines, key, re) {
  if (key === "valor") return { found: false };
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

const fmtN = (t) => fmtMx(numVal(t));
const fracc = (total, ini, n, sub) => `${fmtN(total)} (1 × ${fmtN(ini)} + ${n} × ${fmtN(sub)})`;
const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "");
const fechaMes = (d, mes, y) => `${d}/${MESES[mes.toLowerCase().slice(0, 3)] || mes}/${y}`;

// Datos que dependen del formato de cada aseguradora (vehículo, vigencia, número de cotización, plan).
function datosPorFormato(lines, text, ase) {
  const out = {};
  const m = (re) => text.match(re);
  const modelo = (m(/modelo\s*:?\s*(20\d{2})/i) || [])[1];
  const conModelo = (v) => (v && modelo && !v.includes(modelo) ? `${v} ${modelo}` : v);
  if (ase === "ANA" || ase === "Qualitas") {
    const veh = findLine(lines, /^veh[ií]culo\s*:/i);
    if (veh) out.vehiculo = conModelo(norm(veh.line.replace(/^veh[ií]culo\s*:\s*/i, "")));
    const dv = findLine(lines, /descripci[oó]n del veh[ií]culo/i);
    if (dv && lines[dv.index + 1]) out.vehiculo = conModelo(norm(lines[dv.index + 1].replace(/^\d{3,6}\s+/, "")));
    const v = m(/(?:desde|del)[^\n]{0,30}?(\d{2})\/([A-Za-z]{3})\/(\d{4})[\s\S]{0,80}?hasta[^\n]{0,30}?(\d{2})\/([A-Za-z]{3})\/(\d{4})/i);
    if (v) out.vigencia = `${fechaMes(v[1], v[2], v[3])} al ${fechaMes(v[4], v[5], v[6])}`;
    const nq = m(/^(\d{7,})\s+([A-ZÁÉÍÓÚ]+)\s/m);
    if (nq) { out.numero = nq[1]; out.plan = cap(nq[2]); }
    const pl = m(/plan cobertura\s*:\s*([A-Za-zÁÉÍÓÚ]+)/i);
    if (pl) out.plan = cap(pl[1]);
  }
  if (ase === "GNP") {
    const v = m(/(?:femenino|masculino)\s+(.+)/i);
    if (v) out.vehiculo = norm(v[1]).replace(/^([A-ZÁÉÍÓÚ]+),\s*\1\s/, "$1 ");
    const mo = m(/\b(20\d{2})\b\s+veh[ií]culos|\bModelo\b[^\n]*\n[^\n]*?\b(20\d{2})\b/i);
    const f = m(/folio de cotizaci[oó]n:\s*([A-Z0-9]+)/i);
    if (f) out.numero = f[1];
    const fe = m(/fecha de cotizaci[oó]n:\s*(\d{1,2} [a-záéíóú]+ \d{4})/i);
    const dias = m(/vigencia de (\d+) d[ií]as/i);
    if (fe) out.vigencia = `Cotizado el ${fe[1]}${dias ? ` (válida ${dias[1]} días)` : ""}`;
    const pq = m(/^(Amplia|Limitada|RC|Plus|B[aá]sica)\b.*pago/im) || m(/DETALLE DE COBERTURAS\n([A-Za-záéíóú ]+)\n/);
    if (pq) out.plan = pq[1].trim();
    if (mo && out.vehiculo) { const y = mo[1] || mo[2]; if (y && !out.vehiculo.includes(y)) out.vehiculo += ` ${y}`; }
  }
  if (ase === "AXA") {
    const marca = (m(/Marca:\s*([A-ZÁÉÍÓÚ ]+?)\s+Servicio/) || [])[1];
    const d = findLine(lines, /^descripci[oó]n:/i);
    const desc = d && lines[d.index - 1] ? norm(lines[d.index - 1]) : "";
    out.vehiculo = conModelo(norm(`${marca || ""} ${desc}`));
    const i = m(/fecha de inicio:\s*([\d/]+)/i), f = m(/fecha fin:\s*([\d/]+)/i);
    if (i && f) out.vigencia = `${i[1]} al ${f[1]}`;
    const fo = m(/folio de cotizaci[oó]n:\s*([A-Z0-9]+)/i); if (fo) out.numero = fo[1];
    const pl = m(/tipo de plan:\s*([A-Za-záéíóú]+)/i); if (pl) out.plan = cap(pl[1]);
  }
  if (ase === "Afirme") {
    const v = m(/Veh[ií]culo:\s*[^\n-]*?(?:\d+\s*-\s*)?(.+)/i);
    if (v) out.vehiculo = conModelo(norm(v[1]).replace(/^[A-ZÁÉÍÓÚ]+,\s*\d+\s*-\s*/, ""));
    const fe = m(/fecha de cotizaci[oó]n:\s*(\d{1,2} de [a-záéíóú]+ de \d{4})/i), di = m(/vigencia de (\d+) d[ií]as/i);
    if (fe) out.vigencia = `Cotizado el ${fe[1]}${di ? ` (válida ${di[1]} días)` : ""}`;
    const nq = m(/^cotizaci[oó]n:\s*(\d+)/im); if (nq) out.numero = nq[1];
    const pl = m(/^(AMPLIA|LIMITADA|RC|B[AÁ]SICA|PLUS)$/m); if (pl) out.plan = cap(pl[1]);
  }
  if (ase === "HDI") {
    const a = m(/^([A-ZÁÉÍÓÚ]+),\s*([A-Z0-9 ]+?)\s+(20\d{2})\s+Clave/m), vr = m(/Versi[oó]n:\s*(.+?)\s+Transmisi/);
    if (a) out.vehiculo = norm(`${a[1]} ${a[2]} ${a[3]} ${vr ? vr[1].replace(/,/g, "") : ""}`);
    const v = m(/desde[^\n]*?del (\d{2}\/\d{2}\/\d{4})[\s\S]*?hasta[^\n]*?del (\d{2}\/\d{2}\/\d{4})/i);
    if (v) out.vigencia = `${v[1]} al ${v[2]}`;
    const nq = m(/^cotizaci[oó]n:\s*(\d+)/im); if (nq) out.numero = nq[1];
    const pl = m(/Paquete:\s*(.+?)\s+Tipo Suma/); if (pl) out.plan = pl[1].trim();
  }
  if (ase === "Chubb") {
    const d = m(/descripci[oó]n del veh[ií]culo\*?:\s*(.+)/i), marca = (m(/Marca:\s*([A-ZÁÉÍÓÚ]+)/) || [])[1];
    if (d) out.vehiculo = conModelo(norm(`${marca || ""} ${d[1]}`));
    const v = m(/Del (\d{2})\/([A-Za-z]{3})\/(\d{4})[^\n]*? al (\d{2})\/([A-Za-z]{3})\/(\d{4})/i);
    if (v) out.vigencia = `${fechaMes(v[1], v[2], v[3])} al ${fechaMes(v[4], v[5], v[6])}`;
    const nq = m(/^cotizaci[oó]n:\s*(\d+)/im); if (nq) out.numero = nq[1];
    const pl = m(/Paquete:\s*([A-Za-zÁÉÍÓÚ]+)/); if (pl) out.plan = cap(pl[1]);
  }
  if (ase === "Zurich") {
    const dv = findLine(lines, /^descripci[oó]n$/i);
    if (dv && lines[dv.index + 1]) out.vehiculo = conModelo(norm(lines[dv.index + 1]));
    const my = m(/^(20\d{2})$/m); if (my && out.vehiculo && !out.vehiculo.includes(my[1])) out.vehiculo += ` ${my[1]}`;
    const nq = m(/^(\d{6,})\s+(\d{2}\/\d{2}\/\d{4})$/m);
    if (nq) out.numero = nq[1];
    const dias = m(/Vigencia en d[ií]as[\s\S]*?\b(\d{3})\b/i);
    if (nq) out.vigencia = `Cotizado el ${nq[2]}${dias ? ` (vigencia ${dias[1]} días)` : ""}`;
    const pl = m(/Paquete Coberturas\n(.+)/); if (pl) out.plan = norm(pl[1]).replace(/^Paquete\s+/i, "");
  }
  return out;
}

// Costos que dependen del formato (prima neta, contado y pagos fraccionados con su suma total).
function costosFormato(lines, text, ase) {
  const out = {};
  const m = (re) => text.match(re);
  const PAGOS = { semestral: 1, trimestral: 3, mensual: 11 };
  if (ase === "ANA" || ase === "Qualitas") {
    const g = (re) => (m(re) || [])[1] || "";
    const neta = g(/prima neta\s*:?\s*\$?\s?([\d,]+\.\d{2})/i);
    if (neta) out.neta = num2(neta);
    const total = g(/(?:importe total|prima total)\s*:?\s*\$?\s?([\d,]+\.\d{2})/i);
    const forma = g(/forma de pago\s*:\s*([A-Za-zÁÉÍÓÚ]+)/i);
    let contado = "";
    for (const l of lines) {
      const r = l.match(/^(contado|semestral|trimestral|mensual|bimestral)\s+\$?\s?([\d,]+\.\d{2})(?:\s+\$?\s?([\d,]+\.\d{2}))?/i);
      if (!r) continue;
      const k = r[1].toLowerCase();
      if (k === "contado") { contado = r[2]; out.contado = num2(r[2]); continue; }
      const n = PAGOS_POR_ANIO[k];
      const ini = numVal(r[2]); const sub = r[3] ? numVal(r[3]) : 0;
      if (n && sub) out[k] = `${fmtMx(ini + sub * (n - 1))} (1 × ${fmtMx(ini)} + ${n - 1} × ${fmtMx(sub)})`;
    }
    const t = total || contado;
    if (t) { out.total = num2(t); if (!out.contado && /contado/i.test(forma || "contado")) out.contado = num2(t); }
  }
  if (ase === "GNP") {
    const r = m(/(\d+)\s+pagos?\s+de\s+\$\s?([\d,]+(?:\.\d+)?)\s+\$\s?([\d,]+(?:\.\d+)?)/i);
    if (r) {
      const n = Number(r[1]); const total = `$${r[3]}`;
      out.total = total;
      if (n === 1) out.contado = total;
      else { const k = { 2: "semestral", 4: "trimestral", 12: "mensual", 6: "bimestral" }[n]; if (k) out[k] = `${total} (${n} × $${r[2]})`; }
    }
  }
  if (ase === "AXA") {
    const neta = (m(/prima neta:\s*([\d,]+\.\d{2})/i) || [])[1]; if (neta) out.neta = num2(neta);
    const tot = (m(/prima total anual:\s*([\d,]+\.\d{2})/i) || [])[1];
    if (tot) { out.total = num2(tot); out.contado = num2(tot); }
    const fr = lines.find((l) => /^[\d,]+\.\d{2} [\d,]+\.\d{2} [\d,]+\.\d{2}$/.test(l));
    const freq = ((m(/Frecuencia\s+([A-Za-záéíóú]+)/i) || [])[1] || "").toLowerCase();
    if (fr && PAGOS[freq] !== undefined) { const [t, i, sb] = fr.split(" "); out[freq] = fracc(t, i, PAGOS[freq], sb); }
  }
  if (ase === "Afirme") {
    for (const l of lines) {
      const r = l.match(/^(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL)\s+\$\s?[\d,.]+\s+\$\s?[\d,.]+\s+\$\s?([\d,.]+)\s+\$\s?([\d,.]+)\s+(\d+)\s+\$\s?([\d,.]+)/);
      if (!r) continue;
      const k = r[1].toLowerCase();
      if (k === "anual") { out.total = num2(r[2]); out.contado = num2(r[2]); }
      else out[k] = fracc(r[2], r[3], r[4], r[5]);
    }
  }
  if (ase === "HDI") {
    const fila = lines.find((l) => /^[\d,]+\.\d{2}(?: [\d,]+\.\d{2}){4,}$/.test(l));
    if (fila) { const p = fila.split(" "); out.neta = num2(p[0]); out.total = num2(p[p.length - 1]); out.contado = out.total; }
  }
  if (ase === "Chubb") {
    const neta = (m(/prima neta\s+([\d,]+\.\d{2})/i) || [])[1]; if (neta) out.neta = num2(neta);
    const tt = (m(/^prima total\s+([\d,]+\.\d{2})/im) || [])[1];
    const tot = lines.findIndex((l) => /^\$\s?[\d,.]+\s+\$\s?[\d,.]+\s+\$\s?[\d,.]+$/.test(l));
    if (tot >= 0) {
      const t = lines[tot].replace(/\$/g, "").trim().split(/\s+/);
      out.total = num2(t[0]); out.contado = num2(t[0]);
      const primer = (lines[tot + 1] || "").match(/\$\s?([\d,.]+).*?\$\s?([\d,.]+)/);
      const sub = (lines[tot + 2] || "").match(/\$\s?([\d,.]+)\s+\$\s?([\d,.]+)/);
      if (primer && sub) { out.semestral = fracc(t[1], primer[1], 1, sub[1]); out.trimestral = fracc(t[2], primer[2], 3, sub[2]); }
    } else if (tt) { out.total = num2(tt); out.contado = num2(tt); }
  }
  if (ase === "Zurich") {
    const money = (l) => (l.match(/\$\s?[\d,]+\.\d{2}/g) || []).map((x) => x.replace(/[$\s]/g, ""));
    const ini = money(lines.find((l) => /^Inicial/i.test(l)) || ""), sub = money(lines.find((l) => /^Subsecuente/i.test(l)) || "");
    const pi = lines.findIndex((l) => /^Prima Total$/i.test(l));
    const tot = pi >= 0 ? money(lines[pi + 1] || "") : [];
    if (tot.length === 4 && ini.length === 4 && sub.length === 4) {
      out.total = num2(tot[0]); out.contado = num2(tot[0]);
      out.semestral = fracc(tot[1], ini[1], 1, sub[1]);
      out.trimestral = fracc(tot[2], ini[2], 3, sub[2]);
      out.mensual = fracc(tot[3], ini[3], 11, sub[3]);
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
  const hayTabla = /(?:suma|l[ií]mite|responsabilidad)[^\n]{0,30}deducible|sumas aseguradas/i.test(text);
  const conPrima = /^(?:coberturas|riesgos?|descripci[oó]n)[^\n]*deducible\s+primas?\s*$/im.test(text);
  const estilo = aseguradora === "GNP" && /detalle de coberturas/i.test(text) ? "gnp" : hayTabla ? "tabla" : "generico";
  for (const [key, , re] of COBERTURAS_AUTOS) {
    let c = estilo === "tabla" ? coberturaTabla(limpias, key, re, conPrima) : estilo === "gnp" ? coberturaGNP(limpias, key, re) : parseCobertura(limpias, re, key === "valor");
    if (c.found && SOLO_CON_VALOR.has(key) && !c.suma && !c.deducible) c = { found: false };
    coberturas[key] = c;
  }
  for (const k of ["danos", "robo"]) {
    if (coberturas[k].found && coberturas[k].suma === "Amparada" && /valor comercial/i.test(text)) coberturas[k].suma = "Valor comercial";
  }
  // Si no hay "valor del vehículo", se usa la suma asegurada de daños materiales (valor comercial)
  if (!coberturas.valor.found && coberturas.danos.found && coberturas.danos.suma && coberturas.danos.suma !== "Amparada") {
    coberturas.valor = { found: true, suma: coberturas.danos.suma, deducible: "" };
  }
  const datosFormato = datosPorFormato(limpias, text, aseguradora);

  return {
    archivo: fileName,
    sinTexto: limpias.length === 0,
    aseguradora,
    ramo: detectRamo(text),
    vehiculo: datosFormato.vehiculo || detectVehiculo(limpias),
    vigencia: datosFormato.vigencia || detectVigencia(text),
    numero: datosFormato.numero || (estilo === "generico" ? detectNumero(text) : ""),
    plan: datosFormato.plan || "",
    costos: { ...costos, ...costosFormato(limpias, text, aseguradora) },
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
