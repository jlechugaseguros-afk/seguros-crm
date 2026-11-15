// Resumen de la semana y de las comisiones del mes para el fondo de pantalla y la página de detalle.
// Usa la misma lógica del CRM (pagos, actividades, comisiones) pero con fechas en hora de México.
import { pagosDePoliza } from "../../src/pagos.js";
import { ocurreEn, ESTATUS_CERRADOS } from "../../src/actividades.js";
import { resolverComision, GRUPOS } from "../../src/comisiones.js";

const SUPABASE_URL = "https://sudtvcecdnkbpzzvddfu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ANJ_BkkcnLU8EEq3pqlVRQ_51_xZKz3";
const ZONA = "America/Mexico_City";

export const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function hoyMX() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

const aUTC = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const diasEntre = (a, b) => Math.round((aUTC(b) - aUTC(a)) / 86400000);
const sumaDias = (s, n) => new Date(aUTC(s) + n * 86400000).toISOString().slice(0, 10);

export function etiquetaDia(fecha, hoy) {
  const n = diasEntre(hoy, fecha);
  if (n === 0) return "Hoy";
  if (n === 1) return "Mañana";
  const d = new Date(aUTC(fecha));
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

export async function leerDatos(token) {
  if (!token || token.length < 32) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fondo_datos`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token }),
  });
  if (!r.ok) return null;
  return await r.json();
}

// "María Pérez López" -> "María P."
export function nombreCorto(n) {
  const p = String(n || "").trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "Cliente";
  if (p.length === 1) return p[0];
  return `${p[0]} ${p[1][0].toUpperCase()}.`;
}

export function armarResumen(datos, hoy = hoyMX()) {
  const clients = datos.clients || [];
  const prospectos = datos.prospectos || [];
  const actividades = datos.activities || [];
  const cobranza = datos.cobranza || {};
  const desde = (datos.cobranzaConfig && datos.cobranzaConfig.desde) || "";
  const fin = sumaDias(hoy, 6);

  const items = [];
  let vencidos = 0;

  clients.forEach((c) => {
    (c.polizas || []).forEach((p) => {
      pagosDePoliza(p).forEach((pg) => {
        const reg = cobranza[`${c.id}|${p.id}|${pg.date}`];
        if (reg && reg.pagado) return;
        if (pg.date < hoy) { if (!desde || pg.date >= desde) vencidos++; return; }
        if (pg.date <= fin) items.push({ fecha: pg.date, hora: "", tipo: "pago", texto: `Pago · ${nombreCorto(c.nombre)}`, monto: pg.monto, ramo: p.ramo || "" });
      });
      const ren = p.fechaRenovacion;
      if (ren && ren >= hoy && ren <= fin) items.push({ fecha: ren, hora: "", tipo: "renovacion", texto: `Renovación · ${nombreCorto(c.nombre)}`, monto: Number(p.primaAnual) || 0, ramo: p.ramo || "" });
    });
    if (c.fechaCumple) {
      const [, m, d] = c.fechaCumple.split("-").map(Number);
      for (let i = 0; i <= 6; i++) {
        const f = sumaDias(hoy, i);
        const [, fm, fd] = f.split("-").map(Number);
        if (fm === m && fd === d) items.push({ fecha: f, hora: "", tipo: "cumple", texto: `Cumpleaños · ${nombreCorto(c.nombre)}`, monto: 0, ramo: "" });
      }
    }
  });

  actividades.forEach((a) => {
    if (!a.fecha || ESTATUS_CERRADOS.includes(a.estatus)) return;
    for (let i = 0; i <= 6; i++) {
      const f = sumaDias(hoy, i);
      if (!ocurreEn(a, f)) continue;
      const pr = a.prospectoId ? prospectos.find((x) => x.id === a.prospectoId) : null;
      const quien = pr ? nombreCorto(pr.nombre) : a.prospectoNombre ? nombreCorto(a.prospectoNombre) : "";
      const base = a.tipo || a.titulo || "Actividad";
      items.push({ fecha: f, hora: a.hora || "", tipo: pr || a.prospectoId ? "seguimiento" : "actividad", texto: quien ? `${base} · ${quien}` : `${base}${a.titulo && a.titulo !== a.tipo ? ` · ${a.titulo}` : ""}`, monto: 0, ramo: "" });
    }
  });

  items.sort((x, y) => x.fecha.localeCompare(y.fecha) || (x.hora || "").localeCompare(y.hora || ""));

  // Comisiones del mes (misma regla que Dashboard y Comisiones)
  const mes = hoy.slice(0, 7);
  const porcentajes = datos.porcentajesComision || {};
  const metas = datos.metasComisiones || {};
  const polizas = [];
  clients.forEach((c) => (c.polizas || []).forEach((p) => polizas.push(p)));
  const delMes = polizas.filter((p) => p.fechaAlta && p.fechaAlta.slice(0, 7) === mes && Number(p.primaAnual) > 0);
  let comision = 0, prima = 0;
  delMes.forEach((p) => {
    const r = resolverComision(p, porcentajes);
    comision += ((Number(p.primaAnual) || 0) * r.pct) / 100;
    prima += Number(p.primaAnual) || 0;
  });
  const metaPolizas = GRUPOS.reduce((s, g) => s + (Number((metas[g] || {}).metaPolizas) || 0), 0);
  const metaPrima = GRUPOS.reduce((s, g) => s + (Number((metas[g] || {}).metaPrimaNeta) || 0), 0);
  const avance = metaPrima > 0 ? prima / metaPrima : metaPolizas > 0 ? delMes.length / metaPolizas : null;

  const d = new Date(aUTC(hoy));
  const nombreMes = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][d.getUTCMonth()];

  return {
    hoy,
    fin,
    items,
    vencidos,
    comision: { monto: comision, prima, polizas: delMes.length, metaPolizas, metaPrima, avance, mes: nombreMes },
    nombre: (datos.agentProfile && datos.agentProfile.nombre) || "",
  };
}

export const fmtMXN = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-MX")}`;
export const fmtFechaCorta = (f) => { const [, m, d] = f.split("-").map(Number); return `${d} ${MESES[m - 1]}`; };
