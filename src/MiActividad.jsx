import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Phone, MessageCircle, Repeat2, CalendarCheck, FileText, Send, HeartHandshake, ClipboardList,
  GraduationCap, UserPlus, Trophy, Timer, Play, Square, Undo2, Settings2, Target, Flame, Sparkles,
  TrendingUp, TrendingDown, Clock, ChevronDown, Plus,
} from "lucide-react";
import PageHeader from "./PageHeader.jsx";
import { comisionDePoliza } from "./comisiones.js";
import "./MiActividad.css";

// ---------------------------------------------------------------------------
// Datos base
// ---------------------------------------------------------------------------

export const ORIGENES_PROSPECTO = ["Referido", "Redes sociales", "Prospección en frío", "Cartera actual", "Evento / networking", "Empresa / B2B", "Landing page", "Otro"];

export const CATEGORIAS = {
  prospeccion: { label: "Prospección", color: "#2F80ED" },
  venta: { label: "Venta", color: "#F2994A" },
  servicio: { label: "Servicio a clientes", color: "#1FA971" },
  admin: { label: "Trámites y administración", color: "#EB5757" },
  formacion: { label: "Capacitación", color: "#8E5CF6" },
};

export const TIPOS = [
  { id: "llamada", label: "Llamada", cat: "prospeccion", etapa: "contactos", color: "#2F80ED", Icon: Phone },
  { id: "whatsapp", label: "WhatsApp", cat: "prospeccion", etapa: "contactos", color: "#1FA971", Icon: MessageCircle },
  { id: "seguimiento", label: "Seguimiento", cat: "prospeccion", etapa: "contactos", color: "#8E5CF6", Icon: Repeat2 },
  { id: "cita", label: "Cita", cat: "venta", etapa: "citas", color: "#F2994A", Icon: CalendarCheck },
  { id: "cotizacion", label: "Cotización", cat: "venta", etapa: "cotizaciones", color: "#D4A017", Icon: FileText },
  { id: "solicitud", label: "Solicitud", cat: "venta", etapa: "solicitudes", color: "#E0559A", Icon: Send },
  { id: "servicio", label: "Servicio", cat: "servicio", etapa: null, color: "#14B8A6", Icon: HeartHandshake },
  { id: "admin", label: "Trámites", cat: "admin", etapa: null, color: "#EB5757", Icon: ClipboardList },
  { id: "formacion", label: "Capacitación", cat: "formacion", etapa: null, color: "#7C5CFC", Icon: GraduationCap },
];
const TIPO_POR_ID = Object.fromEntries(TIPOS.map((t) => [t.id, t]));

const ETAPAS = [
  { id: "prospectos", label: "Prospectos nuevos", color: "#2F80ED", Icon: UserPlus, auto: true },
  { id: "contactos", label: "Contactos", color: "#1FA971", Icon: Phone },
  { id: "citas", label: "Citas", color: "#F2994A", Icon: CalendarCheck },
  { id: "cotizaciones", label: "Cotizaciones", color: "#D4A017", Icon: FileText },
  { id: "solicitudes", label: "Solicitudes", color: "#E0559A", Icon: Send },
  { id: "cierres", label: "Cierres", color: "#8E5CF6", Icon: Trophy, auto: true },
];

const SUPUESTOS_DEFAULT = {
  contactosPorProspecto: 2.5,
  contactoACita: 0.25,
  citaACotizacion: 0.6,
  cotizacionASolicitud: 0.4,
  solicitudACierre: 0.8,
};

const CONFIG_DEFAULT = {
  metaMensual: 0,
  diasLaborales: 22,
  comisionPromedio: 0,
  supuestos: SUPUESTOS_DEFAULT,
};

// ---------------------------------------------------------------------------
// Fechas y formato
// ---------------------------------------------------------------------------

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hoyISO() { return toISO(new Date()); }
function sumarDias(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(y, m - 1, d);
  f.setDate(f.getDate() + n);
  return toISO(f);
}
function lunesDe(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(y, m - 1, d);
  f.setDate(f.getDate() - ((f.getDay() + 6) % 7));
  return toISO(f);
}
function fechaDeId(id) {
  const n = Number(id);
  if (!n || n < 1e12) return null;
  return toISO(new Date(n));
}
function enRango(f, desde, hasta) { return !!f && f >= desde && f <= hasta; }
function pesos(n) { return `$${Math.round(Number(n) || 0).toLocaleString("es-MX")}`; }
function horas(min) {
  const m = Math.round(min || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
function pct(n) { return `${Math.round(n * 100)}%`; }

function rangoPeriodo(periodo) {
  const hoy = hoyISO();
  if (periodo === "7d") return { desde: sumarDias(hoy, -6), hasta: hoy, dias: 7 };
  if (periodo === "mes") return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy, dias: Number(hoy.slice(8)) };
  return { desde: sumarDias(hoy, -29), hasta: hoy, dias: 30 };
}

// ---------------------------------------------------------------------------
// Almacenamiento (misma tabla app_data que usa el resto del CRM)
// ---------------------------------------------------------------------------

export function useActividad() {
  const [config, setConfig] = useState(CONFIG_DEFAULT);
  const [log, setLog] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, l] = await Promise.all([window.storage.get("metaActividad"), window.storage.get("actividadLog")]);
        if (c && c.value) {
          const g = JSON.parse(c.value);
          setConfig({ ...CONFIG_DEFAULT, ...g, supuestos: { ...SUPUESTOS_DEFAULT, ...(g.supuestos || {}) } });
        }
        if (l && l.value) {
          const corte = sumarDias(hoyISO(), -400);
          setLog(JSON.parse(l.value).filter((x) => x.fecha >= corte));
        }
        setLoaded(true);
      } catch (e) {
        console.error("No se pudo cargar la actividad:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set("metaActividad", JSON.stringify(config)).catch(() => {});
  }, [config, loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set("actividadLog", JSON.stringify(log)).catch(() => {});
  }, [log, loaded]);

  const api = useMemo(() => ({
    add: (tipo, extra = {}) => {
      const entrada = { id: `${Date.now()}${Math.floor(Math.random() * 100)}`, fecha: hoyISO(), tipo, minutos: 0, origen: "", ...extra };
      setLog((ls) => [...ls, entrada]);
      return entrada.id;
    },
    update: (id, cambios) => setLog((ls) => ls.map((x) => (x.id === id ? { ...x, ...cambios } : x))),
    remove: (id) => setLog((ls) => ls.filter((x) => x.id !== id)),
  }), []);

  return { config, setConfig, log, loaded, ...api };
}

// ---------------------------------------------------------------------------
// Cálculos
// ---------------------------------------------------------------------------


// Todo lo que pasó entre dos fechas: etapas del embudo, minutos por tipo y por categoría, comisión y cierres por origen.
function resumenRango({ log, prospectos, clients, porcentajes, desde, hasta }) {
  const etapas = { prospectos: 0, contactos: 0, citas: 0, cotizaciones: 0, solicitudes: 0, cierres: 0 };
  const tipos = Object.fromEntries(TIPOS.map((t) => [t.id, { n: 0, min: 0 }]));
  const cats = Object.fromEntries(Object.keys(CATEGORIAS).map((c) => [c, 0]));
  let minutos = 0;
  let comision = 0;
  const origenes = {};
  const sumaOrigen = (o, campo, v = 1) => {
    const k = o || "Sin origen";
    origenes[k] = origenes[k] || { prospectos: 0, cierres: 0, comision: 0 };
    origenes[k][campo] += v;
  };

  log.forEach((x) => {
    if (!enRango(x.fecha, desde, hasta)) return;
    const t = TIPO_POR_ID[x.tipo];
    if (!t) return;
    tipos[t.id].n += 1;
    tipos[t.id].min += Number(x.minutos) || 0;
    cats[t.cat] += Number(x.minutos) || 0;
    minutos += Number(x.minutos) || 0;
    if (t.etapa) etapas[t.etapa] += 1;
  });

  const vistos = new Set();
  (prospectos || []).forEach((p) => {
    vistos.add(p.id);
    if (enRango(fechaDeId(p.id), desde, hasta)) { etapas.prospectos += 1; sumaOrigen(p.origen, "prospectos"); }
  });
  (clients || []).forEach((c) => {
    if (c.prospectoId && !vistos.has(c.prospectoId) && enRango(fechaDeId(c.prospectoId), desde, hasta)) {
      etapas.prospectos += 1; sumaOrigen(c.origen, "prospectos");
    }
    (c.polizas || []).forEach((p) => {
      if (p.clasificacion === "Renovación" || !(Number(p.primaAnual) > 0)) return;
      if (!enRango(p.fechaAlta, desde, hasta)) return;
      const cm = comisionDePoliza(p, porcentajes);
      etapas.cierres += 1;
      comision += cm;
      sumaOrigen(c.origen, "cierres");
      sumaOrigen(c.origen, "comision", cm);
    });
  });

  return { etapas, tipos, cats, minutos, comision, origenes };
}

// Tasas de conversión: usa las reales si hay suficiente muestra (≥10 en la etapa previa, últimos 60 días); si no, tus supuestos.
function tasasEfectivas(config, real60) {
  const s = config.supuestos;
  const e = real60.etapas;
  const elegir = (num, den, supuesto, tope = 1) => {
    if (den >= 10 && num > 0) return { valor: Math.min(tope, num / den), fuente: "real" };
    return { valor: supuesto, fuente: "estimada" };
  };
  return {
    contactosPorProspecto: elegir(e.contactos, e.prospectos, s.contactosPorProspecto, 20),
    contactoACita: elegir(e.citas, e.contactos, s.contactoACita),
    citaACotizacion: elegir(e.cotizaciones, e.citas, s.citaACotizacion),
    cotizacionASolicitud: elegir(e.solicitudes, e.cotizaciones, s.cotizacionASolicitud),
    solicitudACierre: elegir(e.cierres, e.solicitudes, s.solicitudACierre),
  };
}

// Meta en cascada: de la meta en pesos hacia atrás hasta los prospectos que hay que conseguir.
function planDesdeMeta(meta, comisionProm, tasas, diasLab) {
  if (!(meta > 0) || !(comisionProm > 0)) return null;
  const cierres = Math.max(1, Math.ceil(meta / comisionProm));
  const solicitudes = Math.ceil(cierres / tasas.solicitudACierre.valor);
  const cotizaciones = Math.ceil(solicitudes / tasas.cotizacionASolicitud.valor);
  const citas = Math.ceil(cotizaciones / tasas.citaACotizacion.valor);
  const contactos = Math.ceil(citas / tasas.contactoACita.valor);
  const prospectos = Math.ceil(contactos / tasas.contactosPorProspecto.valor);
  const mes = { prospectos, contactos, citas, cotizaciones, solicitudes, cierres };
  const semanas = Math.max(1, diasLab / 5);
  const porSemana = {}; const porDia = {};
  Object.keys(mes).forEach((k) => { porSemana[k] = mes[k] / semanas; porDia[k] = mes[k] / Math.max(1, diasLab); });
  return { mes, porSemana, porDia };
}

function calificarTipo(tipo, datos, tasas, totalMin) {
  const t = TIPO_POR_ID[tipo];
  const d = datos.tipos[tipo];
  const parte = totalMin > 0 ? d.min / totalMin : 0;
  if (d.n === 0) return { nivel: "gris", texto: "Sin registros en este periodo" };
  if (t.cat === "admin") {
    return parte > 0.2
      ? { nivel: "rojo", texto: `Te aleja: ${pct(parte)} de tu tiempo. Agrupa trámites en un solo bloque del día.` }
      : { nivel: "ambar", texto: "Necesario, pero no te acerca a la meta. Mantenlo bajo 20%." };
  }
  if (t.cat === "formacion") {
    return parte > 0.15
      ? { nivel: "ambar", texto: `Invertiste ${pct(parte)} del tiempo en capacitarte. Está bien si lo conviertes en ventas.` }
      : { nivel: "azul", texto: "Inversión sana a mediano plazo." };
  }
  if (t.cat === "servicio") {
    return parte > 0.35
      ? { nivel: "ambar", texto: `El servicio ocupa ${pct(parte)} de tu tiempo: protege la cartera, pero también hay que prospectar.` }
      : { nivel: "azul", texto: "Retención: protege tus renovaciones y trae referidos." };
  }
  const mapaTasa = {
    contactos: ["contactoACita", "contactos"],
    citas: ["citaACotizacion", "citas"],
    cotizaciones: ["cotizacionASolicitud", "cotizaciones"],
    solicitudes: ["solicitudACierre", "solicitudes"],
  };
  const [clave, etapa] = mapaTasa[t.etapa] || [];
  if (!clave) return { nivel: "gris", texto: "Sin datos suficientes" };
  const base = datos.etapas[etapa];
  if (base < 5) return { nivel: "gris", texto: "Aún pocos datos para calificarla (necesito 5 o más)." };
  const sig = { contactos: "citas", citas: "cotizaciones", cotizaciones: "solicitudes", solicitudes: "cierres" }[etapa];
  const real = datos.etapas[sig] / base;
  const meta = tasas[clave].valor;
  if (real >= meta) return { nivel: "verde", texto: `Te acerca: convierte ${pct(real)} (objetivo ${pct(meta)}).` };
  if (real >= meta * 0.6) return { nivel: "ambar", texto: `Mejorable: convierte ${pct(real)} (objetivo ${pct(meta)}).` };
  return { nivel: "rojo", texto: `Te aleja: mucho esfuerzo y solo ${pct(real)} avanza (objetivo ${pct(meta)}).` };
}

const CONSEJOS_CUELLO = {
  contactoACita: "Muchos contactos y pocas citas: ensaya tu frase para pedir la cita y propón dos horarios concretos.",
  citaACotizacion: "Hay citas que no llegan a cotización: califica mejor antes de agendar (necesidad, presupuesto, quién decide).",
  cotizacionASolicitud: "Las cotizaciones no se vuelven solicitud: dales seguimiento en 48 horas y presenta máximo dos opciones.",
  solicitudACierre: "Se caen solicitudes antes del cierre: revisa trámites, documentos pendientes y suscripción.",
};

function generarResumenSemanal({ semana, tasas30, mes30, config, ritmo }) {
  const frases = [];
  const totalMin = semana.minutos;
  if (totalMin > 0) {
    const [catTop, minTop] = Object.entries(semana.cats).sort((a, b) => b[1] - a[1])[0];
    if (minTop > 0) {
      frases.push({ tono: "info", texto: `Tu mayor inversión de tiempo esta semana fue ${CATEGORIAS[catTop].label.toLowerCase()}: ${horas(minTop)} (${pct(minTop / totalMin)}).` });
    }
    const adminParte = semana.cats.admin / totalMin;
    if (adminParte > 0.2) frases.push({ tono: "alerta", texto: `Los trámites se llevaron ${pct(adminParte)} de tu tiempo. Agrúpalos en un bloque y protege tus mañanas para prospectar.` });
  } else {
    frases.push({ tono: "info", texto: "Aún no hay minutos registrados esta semana. Con el cronómetro o los minutos rápidos sabré dónde se va tu tiempo." });
  }

  let peor = null;
  [["contactoACita", "contactos", "citas"], ["citaACotizacion", "citas", "cotizaciones"], ["cotizacionASolicitud", "cotizaciones", "solicitudes"], ["solicitudACierre", "solicitudes", "cierres"]].forEach(([k, a, b]) => {
    if (mes30.etapas[a] >= 5) {
      const razon = (mes30.etapas[b] / mes30.etapas[a]) / tasas30[k].valor;
      if (razon < 0.75 && (!peor || razon < peor.razon)) peor = { k, razon };
    }
  });
  if (peor) frases.push({ tono: "alerta", texto: CONSEJOS_CUELLO[peor.k] });

  const orig = Object.entries(mes30.origenes).filter(([o, v]) => o !== "Sin origen" && v.cierres > 0).sort((a, b) => b[1].comision - a[1].comision)[0];
  if (orig) frases.push({ tono: "bien", texto: `Tu mejor fuente de ventas en 30 días es "${orig[0]}": ${orig[1].cierres} cierre${orig[1].cierres === 1 ? "" : "s"} y ${pesos(orig[1].comision)} en comisión. Dale más tiempo.` });

  if (config.metaMensual > 0 && ritmo) {
    if (ritmo.estado === "atrasado") frases.push({ tono: "alerta", texto: `Para alcanzar la meta necesitas generar ${pesos(ritmo.faltante)} en ${ritmo.diasRestantes} días. Concéntrate en citas y solicitudes, que son lo que más rápido se convierte en comisión.` });
    else frases.push({ tono: "bien", texto: ritmo.estado === "adelantado" ? "Vas adelantado en la meta del mes. Mantén el ritmo y adelanta prospección del mes siguiente." : "Vas al ritmo de tu meta. Sostén tus actividades diarias." });
  }
  return frases.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Piezas visuales
// ---------------------------------------------------------------------------

function Anillo({ valor, color = "#8E5CF6", size = 132, children }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valor));
  return (
    <div className="ma-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 132 132" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="maRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2994A" />
            <stop offset="55%" stopColor="#E0559A" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(11,42,68,.09)" strokeWidth="12" />
        <circle
          cx="66" cy="66" r={r} fill="none" stroke="url(#maRingGrad)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 66 66)"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="ma-ring-in">{children}</div>
    </div>
  );
}

function Confeti({ activo }) {
  const piezas = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    const r = (k) => { const x = Math.sin((i + 1) * k) * 10000; return x - Math.floor(x); };
    return {
      id: i,
      izq: Math.round(r(12.9898) * 100),
      demora: Math.round(r(78.233) * 500),
      dur: 1800 + Math.round(r(37.719) * 1400),
      color: ["#F2994A", "#E0559A", "#8E5CF6", "#2F80ED", "#1FA971", "#D4A017"][i % 6],
      giro: Math.round(r(4.1414) * 720 - 360),
    };
  }), []);
  if (!activo) return null;
  return (
    <div className="ma-confeti" aria-hidden="true">
      {piezas.map((p) => (
        <i key={p.id} style={{ left: `${p.izq}%`, background: p.color, animationDelay: `${p.demora}ms`, animationDuration: `${p.dur}ms`, "--giro": `${p.giro}deg` }} />
      ))}
    </div>
  );
}

function Barra({ valor, max, color }) {
  const v = max > 0 ? Math.min(1, valor / max) : 0;
  return (
    <div className="ma-bar"><i style={{ width: `${v * 100}%`, background: color }} /></div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta compacta para el Dashboard
// ---------------------------------------------------------------------------

export function MetaMiniCard({ actividad, comisionMes, onGo }) {
  const { config } = actividad;
  const meta = Number(config.metaMensual) || 0;
  const avance = meta > 0 ? comisionMes / meta : 0;
  return (
    <section className="panel lift ma-mini" style={{ padding: "16px 18px" }}>
      <div className="ma-mini-top">
        <Anillo valor={avance} size={86}>
          <b className="ma-ring-pct" style={{ fontSize: 17 }}>{meta > 0 ? `${Math.round(avance * 100)}%` : "—"}</b>
        </Anillo>
        <div className="ma-mini-txt">
          <h3 className="serif" style={{ fontSize: 17, fontWeight: 500 }}>Mi meta del mes</h3>
          {meta > 0 ? (
            <p><b>{pesos(comisionMes)}</b> de {pesos(meta)}</p>
          ) : (
            <p>Fija tu meta económica y mide tu avance real.</p>
          )}
          <button className="link-btn" onClick={() => onGo("actividad")}>{meta > 0 ? "Ver mi actividad" : "Configurar meta"} →</button>
        </div>
      </div>
      <div className="ma-mini-quick">
        {TIPOS.slice(0, 6).map((t) => (
          <button key={t.id} className="ma-chip" style={{ "--c": t.color }} onClick={() => actividad.add(t.id)} aria-label={`Registrar ${t.label}`}>
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pantalla principal
// ---------------------------------------------------------------------------

export default function MiActividad({ actividad, clients, prospectos, porcentajes, comisionMes }) {
  const { config, setConfig, log } = actividad;
  const [periodo, setPeriodo] = useState("30d");
  const [ultimo, setUltimo] = useState(null);
  const [ajustes, setAjustes] = useState(false);
  const [festejo, setFestejo] = useState(false);
  const [tick, setTick] = useState(0);
  const [cron, setCron] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jl_cron") || "null"); } catch { return null; }
  });
  const [cronTipo, setCronTipo] = useState("llamada");
  const avanceAnterior = useRef(0);

  useEffect(() => {
    if (!cron) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [cron]);

  const hoy = hoyISO();
  const mesIni = `${hoy.slice(0, 7)}-01`;
  const base = { log, prospectos, clients, porcentajes };

  const dHoy = useMemo(() => resumenRango({ ...base, desde: hoy, hasta: hoy }), [log, prospectos, clients, porcentajes, hoy]);
  const dMes = useMemo(() => resumenRango({ ...base, desde: mesIni, hasta: hoy }), [log, prospectos, clients, porcentajes, hoy]);
  const dSemana = useMemo(() => resumenRango({ ...base, desde: lunesDe(hoy), hasta: hoy }), [log, prospectos, clients, porcentajes, hoy]);
  const d30 = useMemo(() => resumenRango({ ...base, desde: sumarDias(hoy, -29), hasta: hoy }), [log, prospectos, clients, porcentajes, hoy]);
  const d60 = useMemo(() => resumenRango({ ...base, desde: sumarDias(hoy, -59), hasta: hoy }), [log, prospectos, clients, porcentajes, hoy]);
  const rango = rangoPeriodo(periodo);
  const dPeriodo = useMemo(() => resumenRango({ ...base, desde: rango.desde, hasta: rango.hasta }), [log, prospectos, clients, porcentajes, periodo, hoy]);

  // Comisión promedio por cierre: la real de los últimos 90 días; si no hay, la que escribas en Ajustes.
  const d90 = useMemo(() => resumenRango({ ...base, desde: sumarDias(hoy, -89), hasta: hoy }), [log, prospectos, clients, porcentajes, hoy]);
  const promReal = d90.etapas.cierres > 0 ? d90.comision / d90.etapas.cierres : 0;
  const comisionProm = Number(config.comisionPromedio) > 0 ? Number(config.comisionPromedio) : promReal;

  const tasas = useMemo(() => tasasEfectivas(config, d60), [config, d60]);
  const meta = Number(config.metaMensual) || 0;
  const diasLab = Number(config.diasLaborales) || 22;
  const plan = useMemo(() => planDesdeMeta(meta, comisionProm, tasas, diasLab), [meta, comisionProm, tasas, diasLab]);

  // Ritmo del mes
  const ahora = new Date();
  const diaMes = ahora.getDate();
  const diasEnMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
  const diasRestantes = diasEnMes - diaMes;
  const avance = meta > 0 ? comisionMes / meta : 0;
  const esperado = meta > 0 ? meta * (diaMes / diasEnMes) : 0;
  const proyeccion = diaMes > 0 ? (comisionMes / diaMes) * diasEnMes : 0;
  let ritmo = null;
  if (meta > 0) {
    const estado = comisionMes >= esperado * 1.05 ? "adelantado" : comisionMes >= esperado * 0.85 ? "alritmo" : "atrasado";
    ritmo = { estado, faltante: Math.max(0, meta - comisionMes), diasRestantes, esperado };
  }

  useEffect(() => {
    if (meta > 0 && avance >= 1 && avanceAnterior.current < 1 && avanceAnterior.current > 0) {
      setFestejo(true);
      const id = setTimeout(() => setFestejo(false), 4200);
      return () => clearTimeout(id);
    }
    avanceAnterior.current = avance;
    return undefined;
  }, [avance, meta]);

  // Registro rápido
  function registrar(tipo) {
    const id = actividad.add(tipo);
    setUltimo({ id, tipo });
  }
  function cerrarUltimo() { setUltimo(null); }
  function deshacer() { if (ultimo) actividad.remove(ultimo.id); setUltimo(null); }
  const entradaUltima = ultimo ? log.find((x) => x.id === ultimo.id) : null;

  function iniciarCron() {
    const c = { tipo: cronTipo, inicio: Date.now() };
    setCron(c);
    try { localStorage.setItem("jl_cron", JSON.stringify(c)); } catch { /* sin almacenamiento */ }
  }
  function detenerCron() {
    if (!cron) return;
    const min = Math.max(1, Math.round((Date.now() - cron.inicio) / 60000));
    const id = actividad.add(cron.tipo, { minutos: min });
    setCron(null);
    try { localStorage.removeItem("jl_cron"); } catch { /* sin almacenamiento */ }
    setUltimo({ id, tipo: cron.tipo });
  }
  const cronSeg = cron ? Math.max(0, Math.floor((Date.now() - cron.inicio) / 1000)) : 0;
  const cronTxt = `${String(Math.floor(cronSeg / 3600)).padStart(2, "0")}:${String(Math.floor((cronSeg % 3600) / 60)).padStart(2, "0")}:${String(cronSeg % 60).padStart(2, "0")}`;
  void tick;

  const resumen = useMemo(() => generarResumenSemanal({ semana: dSemana, tasas30: tasasEfectivas(config, d30), mes30: d30, config, ritmo }), [dSemana, d30, config, meta, diaMes, comisionMes]);

  const totalMinPeriodo = dPeriodo.minutos;
  const catsOrdenadas = Object.entries(dPeriodo.cats).filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]);
  const origenesOrdenados = Object.entries(d90.origenes).sort((a, b) => b[1].comision - a[1].comision || b[1].prospectos - a[1].prospectos);
  const horasPorCierre = dPeriodo.etapas.cierres > 0 && dPeriodo.minutos > 0 ? dPeriodo.minutos / dPeriodo.etapas.cierres : 0;
  const pesosPorHora = dPeriodo.minutos > 0 ? dPeriodo.comision / (dPeriodo.minutos / 60) : 0;

  function guardarSupuesto(clave, valor) {
    const n = Number(String(valor).replace(",", "."));
    setConfig((c) => ({ ...c, supuestos: { ...c.supuestos, [clave]: Number.isFinite(n) ? n : 0 } }));
  }

  const estadoTxt = ritmo
    ? ritmo.estado === "adelantado" ? { t: "Vas adelantado", c: "verde", I: TrendingUp }
      : ritmo.estado === "alritmo" ? { t: "Vas al ritmo", c: "azul", I: Flame }
        : { t: "Vas atrasado", c: "rojo", I: TrendingDown }
    : null;

  return (
    <div className="ma">
      <Confeti activo={festejo} />
      <PageHeader eyebrow="Rendimiento" title="Mi meta y actividad" subtitle="Mide lo que haces cada día, mira cuánto te acerca a tu meta y ajusta tu estrategia con datos reales." />

      {/* 1. Meta del mes */}
      <section className="panel ma-card ma-meta rise" style={{ "--i": 0 }}>
        <div className="ma-meta-row">
          <Anillo valor={avance} size={132}>
            <b className="ma-ring-pct">{meta > 0 ? `${Math.round(avance * 100)}%` : "—"}</b>
            <small>{meta > 0 ? "de tu meta" : "sin meta"}</small>
          </Anillo>
          <div className="ma-meta-info">
            {meta > 0 ? (
              <>
                <p className="ma-big">{pesos(comisionMes)}</p>
                <p className="ma-sub">comisión generada este mes · meta {pesos(meta)}</p>
                {estadoTxt && (
                  <span className={`ma-pill ma-${estadoTxt.c}`}><estadoTxt.I size={14} /> {estadoTxt.t}</span>
                )}
                <p className="ma-sub" style={{ marginTop: 8 }}>
                  Te faltan <b>{pesos(Math.max(0, meta - comisionMes))}</b> en {diasRestantes} día{diasRestantes === 1 ? "" : "s"}.
                  {" "}Al ritmo actual cerrarías el mes en <b>{pesos(proyeccion)}</b>.
                </p>
              </>
            ) : (
              <>
                <p className="ma-big" style={{ fontSize: 20 }}>Fija tu meta económica</p>
                <p className="ma-sub">Escribe cuánto quieres ganar de comisión al mes y te digo cuántas llamadas, citas y cotizaciones necesitas cada día.</p>
                <button className="ma-btn" onClick={() => setAjustes(true)}><Target size={16} /> Fijar mi meta</button>
              </>
            )}
          </div>
        </div>
        {meta > 0 && !(comisionProm > 0) && (
          <p className="ma-nota">Aún no tengo una comisión promedio por póliza. Captura tus primeras pólizas nuevas o escríbela en Ajustes para calcular tu plan.</p>
        )}
      </section>

      {/* 2. Registro rápido */}
      <section className="panel ma-card rise" style={{ "--i": 1 }}>
        <div className="ma-head"><h3 className="serif">Registro rápido de hoy</h3><small>Toca para sumar 1</small></div>
        <div className="ma-tiles">
          {TIPOS.map((t) => (
            <button key={t.id} className="ma-tile" style={{ "--c": t.color }} onClick={() => registrar(t.id)}>
              <span className="ma-tile-ic"><t.Icon size={20} /></span>
              <b>{dHoy.tipos[t.id].n}</b>
              <span>{t.label}</span>
              <i className="ma-plus"><Plus size={12} /></i>
            </button>
          ))}
          <div className="ma-tile ma-tile-auto" style={{ "--c": "#2F80ED" }}>
            <span className="ma-tile-ic"><UserPlus size={20} /></span>
            <b>{dHoy.etapas.prospectos}</b>
            <span>Prospectos</span>
            <em>automático</em>
          </div>
          <div className="ma-tile ma-tile-auto" style={{ "--c": "#8E5CF6" }}>
            <span className="ma-tile-ic"><Trophy size={20} /></span>
            <b>{dHoy.etapas.cierres}</b>
            <span>Cierres</span>
            <em>automático</em>
          </div>
        </div>

        {ultimo && entradaUltima && (
          <div className="ma-ultimo expand">
            <div className="ma-ultimo-top">
              <span><b style={{ color: TIPO_POR_ID[ultimo.tipo].color }}>{TIPO_POR_ID[ultimo.tipo].label}</b> registrada</span>
              <button className="link-btn" onClick={deshacer}><Undo2 size={13} style={{ verticalAlign: "-2px" }} /> Deshacer</button>
            </div>
            <div className="ma-mins">
              <small>¿Cuánto duró?</small>
              {[5, 15, 30, 45, 60].map((m) => (
                <button key={m} className={`ma-chip ${entradaUltima.minutos === m ? "on" : ""}`} onClick={() => actividad.update(ultimo.id, { minutos: m })}>{m} min</button>
              ))}
            </div>
            {TIPO_POR_ID[ultimo.tipo].cat === "prospeccion" && (
              <div className="ma-mins">
                <small>¿De dónde viene?</small>
                <select value={entradaUltima.origen || ""} onChange={(e) => actividad.update(ultimo.id, { origen: e.target.value })}>
                  <option value="">Sin especificar</option>
                  {ORIGENES_PROSPECTO.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
            <button className="ma-listo" onClick={cerrarUltimo}>Listo</button>
          </div>
        )}

        <div className="ma-cron">
          <Timer size={18} />
          {cron ? (
            <>
              <span className="ma-cron-t">{cronTxt}</span>
              <span className="ma-cron-l">{TIPO_POR_ID[cron.tipo].label}</span>
              <button className="ma-btn ma-stop" onClick={detenerCron}><Square size={14} /> Detener</button>
            </>
          ) : (
            <>
              <select value={cronTipo} onChange={(e) => setCronTipo(e.target.value)} aria-label="Tipo de actividad del cronómetro">
                {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <button className="ma-btn" onClick={iniciarCron}><Play size={14} /> Cronómetro</button>
            </>
          )}
        </div>
      </section>

      {/* 3. Plan: lo que necesitas para llegar */}
      <section className="panel ma-card rise" style={{ "--i": 2 }}>
        <div className="ma-head"><h3 className="serif">Lo que necesitas para llegar</h3><small>Hoy · semana · mes</small></div>
        {plan ? (
          <>
            <p className="ma-sub" style={{ marginBottom: 10 }}>
              Con una comisión promedio de <b>{pesos(comisionProm)}</b> por cierre, necesitas <b>{plan.mes.cierres}</b> cierre{plan.mes.cierres === 1 ? "" : "s"} al mes.
            </p>
            <div className="ma-etapas">
              {ETAPAS.map((e, i) => {
                const hoyN = dHoy.etapas[e.id];
                const semN = dSemana.etapas[e.id];
                const mesN = dMes.etapas[e.id];
                return (
                  <div className="ma-etapa" key={e.id} style={{ "--c": e.color, "--i": i }}>
                    <div className="ma-etapa-top">
                      <span className="ma-etapa-ic"><e.Icon size={16} /></span>
                      <b>{e.label}</b>
                      <span className="ma-etapa-n">{mesN} <small>/ {plan.mes[e.id]}</small></span>
                    </div>
                    <Barra valor={mesN} max={plan.mes[e.id]} color={e.color} />
                    <div className="ma-etapa-sub">
                      <span>Hoy {hoyN} / {Math.ceil(plan.porDia[e.id])}</span>
                      <span>Semana {semN} / {Math.ceil(plan.porSemana[e.id])}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="ma-nota">
              Conversión usada: contactos→cita {pct(tasas.contactoACita.valor)} ({tasas.contactoACita.fuente}), cita→cotización {pct(tasas.citaACotizacion.valor)} ({tasas.citaACotizacion.fuente}),
              cotización→solicitud {pct(tasas.cotizacionASolicitud.valor)} ({tasas.cotizacionASolicitud.fuente}), solicitud→cierre {pct(tasas.solicitudACierre.valor)} ({tasas.solicitudACierre.fuente}).
              Con tus datos reales se actualizan solos.
            </p>
          </>
        ) : (
          <p className="ma-sub">Fija tu meta mensual (y una comisión promedio si todavía no tienes pólizas) para ver aquí cuántas actividades necesitas cada día.</p>
        )}
      </section>

      {/* 4. Dónde se va el tiempo */}
      <section className="panel ma-card rise" style={{ "--i": 3 }}>
        <div className="ma-head">
          <h3 className="serif">Dónde invierto mi tiempo</h3>
          <div className="ma-seg" role="tablist" aria-label="Periodo">
            {[["7d", "7 días"], ["30d", "30 días"], ["mes", "Este mes"]].map(([k, l]) => (
              <button key={k} className={periodo === k ? "on" : ""} onClick={() => setPeriodo(k)}>{l}</button>
            ))}
          </div>
        </div>
        {totalMinPeriodo > 0 ? (
          <>
            <div className="ma-stack" aria-hidden="true">
              {catsOrdenadas.map(([c, m]) => <i key={c} style={{ width: `${(m / totalMinPeriodo) * 100}%`, background: CATEGORIAS[c].color }} />)}
            </div>
            <div className="ma-leyenda">
              {catsOrdenadas.map(([c, m]) => (
                <span key={c}><i style={{ background: CATEGORIAS[c].color }} />{CATEGORIAS[c].label} · {horas(m)} ({pct(m / totalMinPeriodo)})</span>
              ))}
            </div>
            <div className="ma-kpis">
              <div><b>{horas(totalMinPeriodo)}</b><small>registradas</small></div>
              <div><b>{dPeriodo.etapas.cierres}</b><small>cierres</small></div>
              <div><b>{horasPorCierre > 0 ? horas(horasPorCierre) : "—"}</b><small>por cierre</small></div>
              <div><b>{pesosPorHora > 0 ? pesos(pesosPorHora) : "—"}</b><small>comisión / hora</small></div>
            </div>
          </>
        ) : (
          <p className="ma-sub">Todavía no hay minutos registrados en este periodo. Después de tocar una actividad, elige cuánto duró, o usa el cronómetro.</p>
        )}

        <div className="ma-semaforo">
          {TIPOS.map((t) => {
            const cal = calificarTipo(t.id, dPeriodo, tasas, totalMinPeriodo);
            const d = dPeriodo.tipos[t.id];
            return (
              <div className={`ma-sem ma-${cal.nivel}`} key={t.id} style={{ "--c": t.color }}>
                <span className="ma-sem-ic"><t.Icon size={16} /></span>
                <div className="ma-sem-body">
                  <b>{t.label} <small>· {d.n} {d.n === 1 ? "vez" : "veces"}{d.min > 0 ? ` · ${horas(d.min)}` : ""}</small></b>
                  <span>{cal.texto}</span>
                </div>
                <i className="ma-sem-dot" />
              </div>
            );
          })}
        </div>
        <p className="ma-nota"><Clock size={12} style={{ verticalAlign: "-1px" }} /> Verde te acerca a tu meta, ámbar es mejorable y rojo te aleja. Se afina conforme registras más.</p>
      </section>

      {/* 5. Origen de prospectos */}
      {origenesOrdenados.length > 0 && (
        <section className="panel ma-card rise" style={{ "--i": 4 }}>
          <div className="ma-head"><h3 className="serif">¿De dónde vienen mis ventas?</h3><small>Últimos 90 días</small></div>
          {origenesOrdenados.map(([o, v]) => (
            <div className="ma-origen" key={o}>
              <b>{o}</b>
              <span>{v.prospectos} prospecto{v.prospectos === 1 ? "" : "s"} · {v.cierres} cierre{v.cierres === 1 ? "" : "s"}</span>
              <em>{pesos(v.comision)}</em>
            </div>
          ))}
          <p className="ma-nota">Elige el origen al capturar cada prospecto en Prospectos para ver qué fuente sí te da comisión.</p>
        </section>
      )}

      {/* 6. Resumen */}
      <section className="panel ma-card ma-resumen rise" style={{ "--i": 5 }}>
        <div className="ma-head"><h3 className="serif"><Sparkles size={16} style={{ verticalAlign: "-2px", color: "#E0559A" }} /> Resumen y ajustes sugeridos</h3></div>
        {resumen.length === 0 && <p className="ma-sub">Registra unos días de actividad y aquí aparecerán tus conclusiones.</p>}
        {resumen.map((f, i) => (
          <div className={`ma-frase ma-${f.tono}`} key={i}><span>{f.texto}</span></div>
        ))}
      </section>

      {/* 7. Ajustes */}
      <section className="panel ma-card rise" style={{ "--i": 6 }}>
        <button className="ma-acordeon" onClick={() => setAjustes((a) => !a)} aria-expanded={ajustes}>
          <span><Settings2 size={16} style={{ verticalAlign: "-3px" }} /> <b>Ajustes de meta y supuestos</b></span>
          <ChevronDown size={18} style={{ transform: ajustes ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
        </button>
        {ajustes && (
          <div className="ma-ajustes expand">
            <label>Meta mensual de comisión ($)
              <input inputMode="decimal" value={config.metaMensual || ""} placeholder="Ej. 30000" onChange={(e) => setConfig((c) => ({ ...c, metaMensual: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 }))} />
            </label>
            <label>Días laborales al mes
              <input inputMode="numeric" value={config.diasLaborales || ""} onChange={(e) => setConfig((c) => ({ ...c, diasLaborales: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 }))} />
            </label>
            <label>Comisión promedio por cierre ($) <small>{promReal > 0 ? `Automática: ${pesos(promReal)}. Déjalo vacío para usarla.` : "Aún sin pólizas para calcularla."}</small>
              <input inputMode="decimal" value={config.comisionPromedio || ""} placeholder={promReal > 0 ? pesos(promReal) : "Ej. 2500"} onChange={(e) => setConfig((c) => ({ ...c, comisionPromedio: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 }))} />
            </label>
            <p className="ma-nota">Tus supuestos de conversión (se reemplazan por los reales cuando tengas 10 o más registros en la etapa).</p>
            {[
              ["contactosPorProspecto", "Contactos por prospecto (número)"],
              ["contactoACita", "Contactos que se vuelven cita (0 a 1)"],
              ["citaACotizacion", "Citas que llegan a cotización (0 a 1)"],
              ["cotizacionASolicitud", "Cotizaciones que se vuelven solicitud (0 a 1)"],
              ["solicitudACierre", "Solicitudes que se cierran (0 a 1)"],
            ].map(([k, l]) => (
              <label key={k}>{l}
                <input inputMode="decimal" defaultValue={config.supuestos[k]} onBlur={(e) => guardarSupuesto(k, e.target.value)} />
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
