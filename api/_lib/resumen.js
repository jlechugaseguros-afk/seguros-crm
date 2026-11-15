// Resumen de "hoy", la semana y las comisiones del mes para el fondo de pantalla y la página de detalle.
// Usa la misma lógica del CRM (pagos, actividades, comisiones) pero con fechas y hora de México.
import { pagosDePoliza } from "../../src/pagos.js";
import { ocurreEn, ESTATUS_CERRADOS } from "../../src/actividades.js";
import { resolverComision, GRUPOS } from "../../src/comisiones.js";

const SUPABASE_URL = "https://sudtvcecdnkbpzzvddfu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ANJ_BkkcnLU8EEq3pqlVRQ_51_xZKz3";
const ZONA = "America/Mexico_City";

export const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const LETRAS = ["D", "L", "M", "M", "J", "V", "S"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function hoyMX() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}
// Minutos transcurridos del día en hora de México (0–1439).
export function ahoraMinMX() {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = Number(p.find((x) => x.type === "hour").value) % 24;
  const m = Number(p.find((x) => x.type === "minute").value);
  return h * 60 + m;
}

const aUTC = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const diasEntre = (a, b) => Math.round((aUTC(b) - aUTC(a)) / 86400000);
const sumaDias = (s, n) => new Date(aUTC(s) + n * 86400000).toISOString().slice(0, 10);
const aMin = (hhmm) => { const [h, m] = String(hhmm || "").split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };

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

export const fmtMXN = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-MX")}`;
export const fmtFechaCorta = (f) => { const [, m, d] = f.split("-").map(Number); return `${d} ${MESES[m - 1]}`; };

// ---- WhatsApp ----
export function linkWa(tel, texto) {
  let d = String(tel || "").replace(/\D/g, "");
  if (d.length === 10) d = `52${d}`;
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(texto)}` : "";
}
export function linkTel(tel) {
  const d = String(tel || "").replace(/\D/g, "");
  return d ? `tel:${d}` : "";
}

// Clasifica una actividad del Planificador para los conteos de "hoy".
function categoriaActividad(texto) {
  const t = String(texto || "").toLowerCase();
  if (/llamada/.test(t)) return "llamada";
  if (/cita|reuni/.test(t)) return "cita";
  if (/whats|correo|mensaje/.test(t)) return "mensaje";
  return "actividad";
}
const NOMBRES_CAT = {
  llamada: ["llamada", "llamadas"], cita: ["cita", "citas"], mensaje: ["mensaje", "mensajes"],
  pago: ["pago", "pagos"], renovacion: ["renovación", "renovaciones"], cumple: ["cumpleaños", "cumpleaños"], actividad: ["actividad", "actividades"],
};
const ORDEN_CAT = ["cita", "llamada", "mensaje", "pago", "renovacion", "cumple", "actividad"];

export function armarResumen(datos, hoy = hoyMX(), ahora = ahoraMinMX()) {
  const clients = datos.clients || [];
  const prospectos = datos.prospectos || [];
  const actividades = datos.activities || [];
  const cobranza = datos.cobranza || {};
  const desde = (datos.cobranzaConfig && datos.cobranzaConfig.desde) || "";
  const fin = sumaDias(hoy, 6);
  const nombreAgente = (datos.agentProfile && datos.agentProfile.nombre) || "";
  const firma = nombreAgente ? ` — ${nombreAgente}` : "";

  const items = [];
  const vencidosLista = [];

  clients.forEach((c) => {
    (c.polizas || []).forEach((p) => {
      const poliza = p.numeroPoliza ? ` de la póliza ${p.numeroPoliza}` : "";
      const aseg = p.aseguradora ? ` (${p.aseguradora})` : "";
      pagosDePoliza(p).forEach((pg) => {
        const reg = cobranza[`${c.id}|${p.id}|${pg.date}`];
        if (reg && reg.pagado) return;
        const monto = pg.monto ? ` por ${fmtMXN(pg.monto)}` : "";
        const parc = pg.total > 1 ? ` (pago ${pg.numero} de ${pg.total})` : "";
        if (pg.date < hoy) {
          if (desde && pg.date < desde) return;
          const dias = diasEntre(pg.date, hoy);
          vencidosLista.push({
            fecha: pg.date, dias, texto: nombreCorto(c.nombre), nombreCompleto: c.nombre, monto: pg.monto, ramo: p.ramo || "", tel: c.telefono || "",
            wa: `Hola ${c.nombre}, te escribo porque tu pago${poliza}${aseg}${monto}${parc} venció el ${fmtFechaCorta(pg.date)}. ¿Me ayudas a regularizarlo? Quedo al pendiente.${firma}`,
          });
          return;
        }
        if (pg.date <= fin) items.push({
          fecha: pg.date, hora: "", tipo: "pago", texto: `Pago · ${nombreCorto(c.nombre)}`, nombreCompleto: c.nombre, monto: pg.monto, ramo: p.ramo || "", tel: c.telefono || "",
          wa: `Hola ${c.nombre}, te recuerdo tu próximo pago${poliza}${aseg} con fecha ${fmtFechaCorta(pg.date)}${monto}${parc}. Cualquier duda quedo al pendiente.${firma}`,
        });
      });
      const ren = p.fechaRenovacion;
      if (ren && ren >= hoy && ren <= fin) items.push({
        fecha: ren, hora: "", tipo: "renovacion", texto: `Renovación · ${nombreCorto(c.nombre)}`, nombreCompleto: c.nombre, monto: Number(p.primaAnual) || 0, ramo: p.ramo || "", tel: c.telefono || "",
        wa: `Hola ${c.nombre}, tu póliza${poliza}${aseg}${p.ramo ? ` de ${p.ramo}` : ""} está por renovarse el ${fmtFechaCorta(ren)}. Te contacto para revisar los detalles.${firma}`,
      });
    });
    if (c.fechaCumple) {
      const [, m, d] = c.fechaCumple.split("-").map(Number);
      for (let i = 0; i <= 6; i++) {
        const f = sumaDias(hoy, i);
        const [, fm, fd] = f.split("-").map(Number);
        if (fm === m && fd === d) items.push({
          fecha: f, hora: "", tipo: "cumple", texto: `Cumpleaños · ${nombreCorto(c.nombre)}`, nombreCompleto: c.nombre, monto: 0, ramo: "", tel: c.telefono || "",
          wa: `¡Feliz cumpleaños, ${c.nombre}! Te deseo un excelente día.${firma}`,
        });
      }
    }
  });

  actividades.forEach((a) => {
    if (!a.fecha || ESTATUS_CERRADOS.includes(a.estatus)) return;
    for (let i = 0; i <= 6; i++) {
      const f = sumaDias(hoy, i);
      if (!ocurreEn(a, f)) continue;
      const pr = a.prospectoId ? prospectos.find((x) => x.id === a.prospectoId) : null;
      const quienFull = pr ? pr.nombre : a.prospectoNombre || "";
      const quien = quienFull ? nombreCorto(quienFull) : "";
      const base = a.tipo || a.titulo || "Actividad";
      items.push({
        fecha: f, hora: a.hora || "", tipo: pr || a.prospectoId ? "seguimiento" : "actividad", cat: categoriaActividad(`${a.tipo || ""} ${a.titulo || ""}`),
        texto: quien ? `${base} · ${quien}` : `${base}${a.titulo && a.titulo !== a.tipo ? ` · ${a.titulo}` : ""}`,
        accion: base, quien, nombreCompleto: quienFull, monto: 0, ramo: "", tel: (pr && pr.telefono) || "",
        wa: quienFull ? `Hola ${quienFull}, te escribo para dar seguimiento a la propuesta de seguro que platicamos. ¿Tienes un momento?${firma}` : "",
      });
    }
  });

  items.sort((x, y) => x.fecha.localeCompare(y.fecha) || (x.hora || "99:99").localeCompare(y.hora || "99:99"));
  vencidosLista.sort((x, y) => y.dias - x.dias);

  // ---- Lo de hoy ----
  const deHoy = items.filter((i) => i.fecha === hoy);
  const conteo = {};
  deHoy.forEach((i) => { const k = i.cat || i.tipo; conteo[k] = (conteo[k] || 0) + 1; });
  const conteosHoy = ORDEN_CAT.filter((k) => conteo[k]).map((k) => ({ clave: k, n: conteo[k], texto: `${conteo[k]} ${NOMBRES_CAT[k][conteo[k] === 1 ? 0 : 1]}` }));

  // ---- Siguiente acción: lo de hoy que aún no pasa; si no hay, lo próximo de la semana ----
  const futuros = items.filter((i) => {
    if (i.fecha > hoy) return true;
    const m = aMin(i.hora);
    return m === null || m >= ahora - 15; // las de hoy sin hora cuentan; las con hora hasta 15 min después
  });
  const prioridad = (i) => (i.tipo === "cumple" ? 1 : 0); // un cumpleaños no es "lo siguiente" si hay otra cosa
  futuros.sort((x, y) => x.fecha.localeCompare(y.fecha) || prioridad(x) - prioridad(y) || (x.hora || "99:99").localeCompare(y.hora || "99:99"));
  const sig = futuros[0] || null;
  let siguiente = null;
  if (sig) {
    let cuando;
    const m = aMin(sig.hora);
    if (sig.fecha === hoy && m !== null) {
      const d = m - ahora;
      cuando = d <= 0 ? "ahora" : d < 60 ? `en ${d} min` : `en ${Math.floor(d / 60)} h${d % 60 ? ` ${d % 60} min` : ""}`;
    } else if (sig.fecha === hoy) cuando = "hoy";
    else cuando = etiquetaDia(sig.fecha, hoy).toLowerCase();
    const titulo = sig.tipo === "pago" ? "Cobrar pago" : sig.tipo === "renovacion" ? "Renovación" : sig.tipo === "cumple" ? "Cumpleaños" : sig.accion || "Actividad";
    siguiente = { hora: sig.hora, titulo, quien: sig.quien || nombreCorto(sig.nombreCompleto || ""), cuando, tipo: sig.tipo, esHoy: sig.fecha === hoy };
    if (!sig.nombreCompleto && sig.tipo !== "pago" && sig.tipo !== "renovacion" && sig.tipo !== "cumple") siguiente.quien = sig.quien || "";
  }

  // ---- Tira de 7 días ----
  const tira = [];
  for (let i = 0; i < 7; i++) {
    const f = sumaDias(hoy, i);
    const d = new Date(aUTC(f));
    tira.push({ letra: LETRAS[d.getUTCDay()], num: d.getUTCDate(), n: items.filter((x) => x.fecha === f).length, esHoy: i === 0 });
  }

  // ---- Comisiones del mes y ritmo de la meta ----
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

  const [y, mm, dd] = hoy.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(y, mm, 0)).getUTCDate();
  const diasRestantes = ultimoDia - dd + 1; // contando hoy
  const faltanPolizas = Math.max(0, metaPolizas - delMes.length);
  let ritmo;
  if (avance === null) ritmo = "Captura tu meta del mes en Comisiones";
  else if (avance >= 1) ritmo = "Meta cumplida. Todo lo que sigue es extra";
  else if (metaPolizas > 0 && faltanPolizas > 0) {
    const cada = Math.max(1, Math.floor(diasRestantes / faltanPolizas));
    ritmo = faltanPolizas === 1 ? `Te falta 1 póliza · ${diasRestantes} días para cerrar` : `Te faltan ${faltanPolizas} pólizas · 1 cada ${cada} día${cada === 1 ? "" : "s"}`;
  } else ritmo = `Quedan ${diasRestantes} día${diasRestantes === 1 ? "" : "s"} del mes`;

  return {
    hoy, fin, items, vencidosLista, vencidos: vencidosLista.length,
    conteosHoy, siguiente, tira, nombre: nombreAgente,
    comision: { monto: comision, prima, polizas: delMes.length, metaPolizas, metaPrima, avance, mes: MESES_LARGO[mm - 1], diasRestantes, ritmo },
  };
}
