import React, { useState, useEffect, useMemo } from "react";
import { Home, FileText, ShieldAlert, MessageCircle, LayoutGrid, Download, LogOut, X, Share, MoreVertical, Smartphone, CalendarClock, ChevronRight, Phone } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { JL_LOGO } from "./brandAssets.js";
import PageHeader from "./PageHeader.jsx";
import { calcularDyC } from "./CalculadoraDeducible.jsx";

// ───────── Agente al que pertenece este portal ─────────
// El enlace que comparte cada agente trae su id (?a=...). Se recuerda en el dispositivo,
// porque tras abrir el enlace del correo la página se recarga sin el parámetro.
const JOSHUA_ID = "c3aca0b3-a1ae-4816-ab0c-4ebe5dddb777";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function resolverAgenteId() {
  let id = "";
  try { id = new URLSearchParams(window.location.search).get("a") || ""; } catch (e) { /* sin URL */ }
  if (UUID_RE.test(id)) { try { localStorage.setItem("jl_portal_agente", id); } catch (e) { /* sin almacenamiento */ } return id; }
  try { id = localStorage.getItem("jl_portal_agente") || ""; } catch (e) { id = ""; }
  return UUID_RE.test(id) ? id : JOSHUA_ID;
}
const AGENTE_ID = resolverAgenteId();
const ES_JL = AGENTE_ID === JOSHUA_ID;
const ASESOR_JL = {
  nombre: "Joshua Lechuga Plata",
  titulo: "Asesor en protección y planeación patrimonial",
  whatsapp: "522441071011",
  whatsappVisible: "244 107 1011",
  correo: "jlechuga.seguros@gmail.com",
};
function contactoDe(data) {
  if (ES_JL) return ASESOR_JL;
  const a = data?.agente || {};
  let d = String(a.whatsapp || "").replace(/\D/g, "");
  if (d.length === 10) d = "52" + d;
  return { nombre: a.nombre || "Tu asesor", titulo: "Tu asesor de seguros", whatsapp: d.length >= 12 ? d : "", whatsappVisible: a.whatsapp || "", correo: a.correo || "" };
}
const primerNombre = (c) => String(c.nombre || "").split(" ")[0] || "";
// Enlace de contacto con el asesor: WhatsApp si hay número; si no, correo.
function enlace(data, texto) {
  const c = contactoDe(data);
  if (c.whatsapp) return `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(texto)}`;
  if (c.correo) return `mailto:${c.correo}?subject=${encodeURIComponent("Portal de clientes")}&body=${encodeURIComponent(texto)}`;
  return "#";
}
function Cab({ eyebrow, title, subtitle }) {
  if (ES_JL) return <Cab eyebrow={eyebrow} title={title} subtitle={subtitle} />;
  return (
    <header style={{ background: "radial-gradient(120% 140% at 0% 0%, #123B5C 0%, var(--ink) 55%, var(--ink-2) 100%)", borderRadius: 22, padding: "26px 24px", marginBottom: 18, color: "#fff" }}>
      {eyebrow && <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700 }}>{eyebrow}</div>}
      <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: "6px 0 4px" }}>{title}</h2>
      {subtitle && <p style={{ color: "#C7D3DE", fontSize: 14 }}>{subtitle}</p>}
    </header>
  );
}

const PRODUCTOS = [
  { t: "Protección", d: "Vida, gastos médicos mayores, autos y accidentes para ti y tu familia.", q: "seguros de protección (vida, gastos médicos, autos)" },
  { t: "Seguridad social", d: "Pensión IMSS, Modalidad 10, INFONAVIT: revisa tus semanas y tus opciones.", q: "seguridad social (pensión IMSS, Modalidad 10, INFONAVIT)" },
  { t: "Retiro", d: "Plan Personal de Retiro (PPR) para construir tu ingreso futuro con beneficio fiscal.", q: "un plan de retiro (PPR)" },
  { t: "Patrimonio", d: "Planeación para proteger y hacer crecer lo que has construido.", q: "planeación patrimonial" },
  { t: "Bienes", d: "Hogar, negocio y bienes: protege lo que tienes contra imprevistos.", q: "seguros para hogar, negocio o bienes" },
];
const TEMAS_ASESORIA = ["Seguro de vida", "Gastos médicos mayores", "Seguro de auto", "Retiro / PPR", "Pensión IMSS", "Modalidad 10", "INFONAVIT", "Patrimonio y bienes", "Otro tema"];

// ───────── Utilidades de fechas y pagos ─────────
const PAGOS_POR_ANIO = { Mensual: 12, Trimestral: 4, Semestral: 2, Anual: 1 };
const MESES_ENTRE_PAGOS = { Mensual: 1, Trimestral: 3, Semestral: 6, Anual: 12 };

function addMonthsStr(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const total = (m - 1) + months;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const last = new Date(ny, nm + 1, 0).getDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
function pagosDePoliza(p) {
  if (!p || !p.fechaPago) return [];
  const total = PAGOS_POR_ANIO[p.pagoFraccionado] || 1;
  const paso = MESES_ENTRE_PAGOS[p.pagoFraccionado] || 12;
  const prima = Number(p.primaAnual) || 0;
  const monto = prima > 0 ? Math.round((prima / total) * 100) / 100 : 0;
  const limite = p.finVigencia || p.fechaRenovacion || "";
  const pagos = [];
  for (let k = 0; k < total; k++) {
    const date = addMonthsStr(p.fechaPago, k * paso);
    if (k > 0 && limite && date >= limite) break;
    pagos.push({ date, numero: k + 1, total, monto });
  }
  return pagos;
}
const hoyStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtFecha = (s) => (s ? s.split("-").reverse().join("/") : "—");
const mxn = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const diasPara = (s) => Math.round((new Date(s + "T00:00:00") - new Date(hoyStr() + "T00:00:00")) / 86400000);
const cuando = (d) => (d === 0 ? "Hoy" : d === 1 ? "Mañana" : d < 0 ? `Venció hace ${-d} d` : `En ${d} días`);

// ───────── Instalación como app ─────────
const esStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const esSafariIOS = () => esIOS() && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|opios/i.test(navigator.userAgent);
const LS_NO_MOSTRAR = "jl_portal_instalar_oculto";
const leerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const escribirLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };

function Paso({ n, children }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: n > 1 ? "1px solid var(--line)" : "none" }}>
      <span style={{ flex: "none", width: 26, height: 26, borderRadius: "50%", background: "var(--ink)", color: "var(--gold)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 }}>{n}</span>
      <div style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink)" }}>{children}</div>
    </div>
  );
}

function InstalarModal({ onClose, instalarNativo }) {
  const [plat, setPlat] = useState(esIOS() ? "ios" : "android");
  const [noMas, setNoMas] = useState(false);
  function cerrar() { if (noMas) escribirLS(LS_NO_MOSTRAR, "1"); onClose(); }
  const tab = (id, label) => (
    <button type="button" onClick={() => setPlat(id)} style={{ flex: 1, padding: "9px 8px", border: "1px solid var(--line)", background: plat === id ? "var(--ink)" : "#fff", color: plat === id ? "#fff" : "var(--ink)", fontWeight: 600, fontSize: 13, borderRadius: id === "ios" ? "10px 0 0 10px" : "0 10px 10px 0", cursor: "pointer" }}>{label}</button>
  );
  return (
    <div role="dialog" aria-modal="true" aria-label="Instalar la app" onClick={cerrar} style={{ position: "fixed", inset: 0, background: "rgba(7,29,49,.62)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, padding: 20, animation: "rise .4s cubic-bezier(.2,.7,.2,1)", maxHeight: "92dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <img src="/jl-icon-192.png" alt="" width={44} height={44} style={{ borderRadius: 11 }} />
            <div>
              <h3 className="serif" style={{ fontSize: 18, color: "var(--ink)", lineHeight: 1.2 }}>Ten tu portal a un toque</h3>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Agrégalo a tu pantalla de inicio y ya no tendrás que buscar el enlace.</p>
            </div>
          </div>
          <button type="button" onClick={cerrar} aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", margin: "16px 0 6px" }}>{tab("ios", "iPhone / iPad")}{tab("android", "Android")}</div>

        {plat === "ios" ? (
          <div>
            {!esSafariIOS() && esIOS() && (
              <p style={{ fontSize: 12, background: "var(--gold-soft)", borderRadius: 10, padding: "8px 10px", margin: "8px 0", color: "var(--ink)" }}>
                Ábrelo en <b>Safari</b>: en iPhone solo se puede instalar desde ahí. Copia este enlace y pégalo en Safari.
              </p>
            )}
            <Paso n={1}>Toca el botón <b>Compartir</b> <Share size={15} style={{ verticalAlign: "-3px" }} /> (abajo en Safari, o arriba a la derecha en iPad).</Paso>
            <Paso n={2}>Desliza hacia abajo y elige <b>“Agregar a pantalla de inicio”</b>.</Paso>
            <Paso n={3}>Toca <b>“Agregar”</b>. ¡Listo! Verás el ícono de J L junto a tus demás apps.</Paso>
          </div>
        ) : (
          <div>
            {instalarNativo && (
              <button type="button" onClick={async () => { await instalarNativo(); cerrar(); }} className="btn-gold" style={{ width: "100%", margin: "10px 0 4px", padding: "12px 14px", border: "none", borderRadius: 10, background: "var(--gold)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Download size={16} /> Instalar ahora
              </button>
            )}
            <Paso n={1}>Abre este portal en <b>Chrome</b> y toca el menú <MoreVertical size={15} style={{ verticalAlign: "-3px" }} /> (los tres puntos, arriba a la derecha).</Paso>
            <Paso n={2}>Elige <b>“Instalar aplicación”</b> o <b>“Agregar a la pantalla principal”</b>.</Paso>
            <Paso n={3}>Confirma con <b>“Instalar”</b>. El ícono de J L aparecerá en tu pantalla de inicio.</Paso>
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", marginTop: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={noMas} onChange={(e) => setNoMas(e.target.checked)} /> No volver a mostrar este aviso
        </label>
        <button type="button" onClick={cerrar} style={{ width: "100%", marginTop: 12, padding: "11px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "#fff", color: "var(--ink)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Entendido</button>
      </div>
    </div>
  );
}

// ───────── Pantalla de acceso ─────────
function Acceso() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("idle"); // idle | enviando | enviado | error
  async function enviar(e) {
    e.preventDefault();
    setEstado("enviando");
    try {
      const { error } = await supabase.functions.invoke("portal-enlace", { body: { email, redirectTo: window.location.origin, agentId: AGENTE_ID } });
      setEstado(error ? "error" : "enviado");
    } catch (err) { setEstado("error"); }
  }
  return (
    <div style={{ minHeight: "100dvh", background: "var(--cream)", display: "flex", flexDirection: "column", fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "22px 20px 8px" }}>
        {ES_JL ? <img src={JL_LOGO} alt="J L Consultoría Patrimonial" style={{ height: 110, objectFit: "contain" }} /> : <div className="serif" style={{ fontSize: 26, padding: "26px 0 6px", color: "var(--ink)" }}>Portal de clientes</div>}
      </div>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "12px 16px 32px" }}>
        <div className="panel stagger" style={{ width: "100%", maxWidth: 420, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold-text)", fontWeight: 700 }}>Portal de clientes</div>
          <h1 className="serif" style={{ fontSize: 26, color: "var(--ink)", margin: "6px 0 6px", lineHeight: 1.15 }}>Tus pólizas, siempre contigo</h1>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18 }}>Escribe el correo que registraste con tu asesor y te enviamos un enlace para entrar. Sin contraseñas.</p>
          {estado === "enviado" ? (
            <div style={{ background: "var(--gold-soft)", borderRadius: 12, padding: 14, fontSize: 14, color: "var(--ink)" }}>
              <b>Revisa tu correo.</b> Si <b>{email}</b> está registrado, te llegará un enlace para entrar (revisa también spam). Ábrelo en este mismo dispositivo.
              <button type="button" onClick={() => setEstado("idle")} style={{ display: "block", marginTop: 10, background: "none", border: "none", color: "var(--gold-text)", fontWeight: 600, cursor: "pointer", padding: 0 }}>Usar otro correo</button>
            </div>
          ) : (
            <form onSubmit={enviar}>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Correo electrónico</label>
              <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" style={{ width: "100%", padding: "13px 14px", border: "2px solid var(--gold)", borderRadius: 10, fontSize: 16, background: "#fff", color: "var(--ink)", marginBottom: 12 }} />
              <button type="submit" disabled={estado === "enviando"} style={{ width: "100%", padding: "13px 14px", border: "none", borderRadius: 10, background: "var(--ink)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: estado === "enviando" ? 0.6 : 1 }}>
                {estado === "enviando" ? "Enviando…" : "Enviarme el enlace de acceso"}
              </button>
              {estado === "error" && <p style={{ fontSize: 12, color: "#B23A2E", marginTop: 10 }}>No pudimos enviar el enlace. Intenta de nuevo en un momento o escríbele a tu asesor.</p>}
            </form>
          )}
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 18 }}>
            {ES_JL
              ? <>¿Aún no eres cliente o tu correo no funciona? <a href={`https://wa.me/${ASESOR_JL.whatsapp}?text=${encodeURIComponent("Hola Joshua, quiero acceder al portal de clientes.")}`} style={{ color: "var(--gold-text)", fontWeight: 600 }}>Escríbeme por WhatsApp</a>.</>
              : <>¿Tu correo no funciona? Pídele a tu asesor que lo registre en tu expediente.</>}
          </p>
        </div>
      </div>
    </div>
  );
}

// ───────── Secciones ─────────
function Inicio({ data, setTab }) {
  const { proximos, renovaciones } = useMemo(() => {
    const hoy = hoyStr();
    const pagos = [];
    (data.polizas || []).forEach((p) => pagosDePoliza(p).forEach((g) => { if (g.date >= hoy) pagos.push({ ...g, p }); }));
    pagos.sort((a, b) => a.date.localeCompare(b.date));
    const ren = (data.polizas || []).filter((p) => p.finVigencia && p.finVigencia >= hoy).sort((a, b) => a.finVigencia.localeCompare(b.finVigencia));
    return { proximos: pagos.slice(0, 4), renovaciones: ren.slice(0, 3) };
  }, [data]);
  const primero = proximos[0];
  const nombre = (data.cliente.nombre || "").split(" ")[0];
  return (
    <div className="stagger">
      <Cab eyebrow="Tu portal" title={`Hola, ${nombre}`} subtitle="Aquí tienes el resumen de tus seguros." />
      {primero ? (
        <div className="panel" style={{ padding: 16, marginBottom: 14, borderLeft: "4px solid var(--gold)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--gold-text)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}><CalendarClock size={14} /> Próximo pago</div>
          <div className="serif" style={{ fontSize: 28, color: "var(--ink)", margin: "6px 0 2px" }}>{mxn(primero.monto)}</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{primero.p.aseguradora} · {primero.p.ramo} · {fmtFecha(primero.date)} <b style={{ color: diasPara(primero.date) <= 3 ? "#B23A2E" : "var(--emerald)" }}>({cuando(diasPara(primero.date))})</b></div>
        </div>
      ) : (
        <div className="panel" style={{ padding: 16, marginBottom: 14, fontSize: 14, color: "var(--muted)" }}>No hay pagos próximos registrados.</div>
      )}

      {proximos.length > 1 && (
        <>
          <h3 className="serif" style={{ fontSize: 14, color: "var(--ink)", margin: "4px 0 8px" }}>Calendario de pagos</h3>
          <div className="panel" style={{ overflow: "hidden", marginBottom: 14 }}>
            {proximos.map((g, i) => (
              <div key={g.p.id + g.date} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "11px 14px", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 13 }}>
                <div><div style={{ fontWeight: 600, color: "var(--ink)" }}>{g.p.aseguradora} · {g.p.ramo}</div><div style={{ color: "var(--muted)", fontSize: 12 }}>{fmtFecha(g.date)} · pago {g.numero} de {g.total}</div></div>
                <div style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{mxn(g.monto)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {renovaciones.length > 0 && (
        <>
          <h3 className="serif" style={{ fontSize: 14, color: "var(--ink)", margin: "4px 0 8px" }}>Vigencias</h3>
          <div className="panel" style={{ overflow: "hidden", marginBottom: 14 }}>
            {renovaciones.map((p, i) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "11px 14px", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{p.aseguradora} · {p.ramo}</div>
                <div style={{ color: "var(--muted)" }}>vence {fmtFecha(p.finVigencia)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <button type="button" onClick={() => setTab("siniestro")} className="panel" style={{ padding: 14, textAlign: "left", cursor: "pointer", border: "1px solid var(--line)" }}><ShieldAlert size={20} color="var(--gold-text)" /><div style={{ fontWeight: 700, color: "var(--ink)", marginTop: 8, fontSize: 14 }}>Reportar siniestro</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Te guío paso a paso</div></button>
        <button type="button" onClick={() => setTab("asesoria")} className="panel" style={{ padding: 14, textAlign: "left", cursor: "pointer", border: "1px solid var(--line)" }}><MessageCircle size={20} color="var(--gold-text)" /><div style={{ fontWeight: 700, color: "var(--ink)", marginTop: 8, fontSize: 14 }}>Pedir asesoría</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Resuelve tus dudas</div></button>
      </div>
    </div>
  );
}

function Polizas({ data }) {
  const [abierta, setAbierta] = useState(null);
  const [gastos, setGastos] = useState("300000");
  const ps = data.polizas || [];
  return (
    <div className="stagger">
      <Cab eyebrow="Mis seguros" title="Mis pólizas" subtitle="Consulta tus datos y descarga tu póliza." />
      {ps.length === 0 && <div className="panel" style={{ padding: 16, fontSize: 14, color: "var(--muted)" }}>Aún no hay pólizas registradas en tu cuenta.</div>}
      {ps.map((p) => {
        const open = abierta === p.id;
        const esGmm = p.ramo === "GMM" && Number(p.deducible) > 0;
        const calc = esGmm ? calcularDyC({ gastos: Number(String(gastos).replace(/[^0-9.]/g, "")) || 0, deducible: Number(p.deducible), coaseguroPct: Number(p.coaseguroPct) || 0, tope: Number(p.topeCoaseguro) || 0 }) : null;
        const fila = (k, v) => v ? <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>{k}</span><span style={{ color: "var(--ink)", fontWeight: 600, textAlign: "right" }}>{v}</span></div> : null;
        return (
          <div key={p.id} className="panel" style={{ marginBottom: 12, overflow: "hidden" }}>
            <button type="button" onClick={() => setAbierta(open ? null : p.id)} style={{ width: "100%", background: "none", border: "none", padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer", textAlign: "left" }}>
              <div><div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>{p.aseguradora} · {p.ramo}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Póliza {p.numeroPoliza || "sin número"} · vence {fmtFecha(p.finVigencia)}</div></div>
              <ChevronRight size={18} color="var(--muted)" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
            </button>
            {open && (
              <div style={{ padding: "0 14px 14px" }}>
                {fila("Inicio de vigencia", fmtFecha(p.inicioVigencia))}
                {fila("Fin de vigencia", fmtFecha(p.finVigencia))}
                {fila("Prima anual", p.primaAnual ? `${mxn(p.primaAnual)} ${p.moneda || ""}` : "")}
                {fila("Forma de pago", p.pagoFraccionado)}
                {fila("Método de pago", p.metodoPago)}
                {fila("Siguiente pago", p.fechaPago ? fmtFecha(p.fechaPago) : "")}
                {p.docUrl && <a href={p.docUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, padding: "11px 14px", borderRadius: 10, background: "var(--ink)", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}><FileText size={16} /> Ver / descargar mi póliza</a>}
                {esGmm && (
                  <div style={{ marginTop: 14, background: "var(--cream)", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 2 }}>¿Cuánto pagaría en un siniestro?</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>Deducible {mxn(p.deducible)} · coaseguro {p.coaseguroPct || 0}%{Number(p.topeCoaseguro) > 0 ? ` · tope ${mxn(p.topeCoaseguro)}` : ""}</div>
                    <input inputMode="decimal" value={gastos} onChange={(e) => setGastos(e.target.value)} placeholder="Gastos del hospital" style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 15, background: "#fff", color: "var(--ink)", marginBottom: 8 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Tú pagas</span><b style={{ color: "#B23A2E" }}>{mxn(calc.paga)}</b></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}><span>La aseguradora paga</span><b style={{ color: "var(--emerald)" }}>{mxn(calc.aseguradora)}</b></div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>Simulación informativa; aplican las condiciones de tu póliza.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Siniestro({ data }) {
  const ps = data.polizas || [];
  const [pid, setPid] = useState(ps[0]?.id || "");
  const [tipo, setTipo] = useState("");
  const [relato, setRelato] = useState("");
  const p = ps.find((x) => x.id === pid);
  const nombre = `${data.cliente.nombre} ${data.cliente.apellido}`.trim();
  const msg = `Hola ${primerNombre(contactoDe(data))}, soy ${nombre}. Quiero reportar un siniestro.\nPóliza: ${p ? `${p.aseguradora} · ${p.ramo} · ${p.numeroPoliza || "s/n"}` : "(sin elegir)"}\nTipo: ${tipo || "(sin especificar)"}\nQué pasó: ${relato || "(te lo cuento por aquí)"}`;
  const tipos = (p?.ramo === "Autos") ? ["Choque", "Robo", "Daños a terceros", "Cristales", "Otro"] : (p?.ramo === "GMM") ? ["Hospitalización", "Cirugía", "Consulta / estudios", "Medicamentos", "Otro"] : ["Daño o pérdida", "Fallecimiento / invalidez", "Reembolso", "Otro"];
  return (
    <div className="stagger">
      <Cab eyebrow="Estoy contigo" title="Reportar siniestro" subtitle="Cuéntame qué pasó y te acompaño con el trámite." />
      <div className="panel" style={{ padding: 14, marginBottom: 14, background: "var(--gold-soft)", borderColor: "transparent", fontSize: 13, color: "var(--ink)" }}>
        <b>Si es una emergencia</b>, primero llama a la línea de siniestros de tu aseguradora (viene en tu póliza) o al 911. Después cuéntame aquí.
      </div>
      <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Póliza afectada</label>
        <select value={pid} onChange={(e) => { setPid(e.target.value); setTipo(""); }} style={{ width: "100%", padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff", color: "var(--ink)", marginBottom: 12 }}>
          {ps.map((x) => <option key={x.id} value={x.id}>{x.aseguradora} · {x.ramo} · {x.numeroPoliza || "s/n"}</option>)}
        </select>
        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>Tipo de siniestro</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {tipos.map((t) => <button key={t} type="button" onClick={() => setTipo(t)} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid var(--line)", background: tipo === t ? "var(--ink)" : "#fff", color: tipo === t ? "#fff" : "var(--ink)", fontSize: 13, cursor: "pointer" }}>{t}</button>)}
        </div>
        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>¿Qué pasó?</label>
        <textarea rows={4} value={relato} onChange={(e) => setRelato(e.target.value)} placeholder="Fecha, lugar y una breve descripción…" style={{ width: "100%", padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff", color: "var(--ink)", fontFamily: "inherit" }} />
        <a href={enlace(data, msg)} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, padding: "13px 14px", borderRadius: 10, background: "var(--gold)", color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none" }}><MessageCircle size={18} /> Enviar a mi asesor por WhatsApp</a>
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Puedes adjuntar fotos y documentos directamente en la conversación de WhatsApp.</p>
      </div>
    </div>
  );
}

function Asesoria({ data }) {
  const [tema, setTema] = useState("");
  const [duda, setDuda] = useState("");
  const nombre = `${data.cliente.nombre} ${data.cliente.apellido}`.trim();
  const msg = `Hola ${primerNombre(contactoDe(data))}, soy ${nombre}. Me gustaría una asesoría sobre: ${tema || "(por definir)"}.\n${duda}`.trim();
  return (
    <div className="stagger">
      <Cab eyebrow="Conversemos" title="Pedir asesoría" subtitle="Elige un tema y cuéntame tu duda." />
      <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>Tema</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {TEMAS_ASESORIA.map((t) => <button key={t} type="button" onClick={() => setTema(t)} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid var(--line)", background: tema === t ? "var(--ink)" : "#fff", color: tema === t ? "#fff" : "var(--ink)", fontSize: 13, cursor: "pointer" }}>{t}</button>)}
        </div>
        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Tu duda (opcional)</label>
        <textarea rows={4} value={duda} onChange={(e) => setDuda(e.target.value)} placeholder="Cuéntame brevemente qué necesitas…" style={{ width: "100%", padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff", color: "var(--ink)", fontFamily: "inherit" }} />
        <a href={enlace(data, msg)} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, padding: "13px 14px", borderRadius: 10, background: "var(--gold)", color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none" }}><MessageCircle size={18} /> Solicitar por WhatsApp</a>
      </div>
      <div className="panel" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <Phone size={20} color="var(--gold-text)" />
        <div style={{ fontSize: 13, color: "var(--ink)" }}><b>{contactoDe(data).nombre}</b><br /><span style={{ color: "var(--muted)" }}>{contactoDe(data).titulo}</span><br /><span style={{ color: "var(--muted)" }}>{[contactoDe(data).whatsappVisible && `WhatsApp ${contactoDe(data).whatsappVisible}`, contactoDe(data).correo].filter(Boolean).join(" · ")}</span></div>
      </div>
    </div>
  );
}

function Productos({ data }) {
  const nombre = `${data.cliente.nombre} ${data.cliente.apellido}`.trim();
  return (
    <div className="stagger">
      <Cab eyebrow="Para crecer y proteger" title="Otros productos" subtitle="Conoce toda la gama de servicios que puedo ofrecerte." />
      {PRODUCTOS.map((x) => (
        <div key={x.t} className="panel" style={{ padding: 16, marginBottom: 12 }}>
          <h3 className="serif" style={{ fontSize: 17, color: "var(--ink)" }}>{x.t}</h3>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 10px" }}>{x.d}</p>
          <a href={enlace(data, `Hola ${primerNombre(contactoDe(data))}, soy ${nombre}. Quiero información sobre ${x.q}.`)} target="_blank" rel="noreferrer" style={{ color: "var(--gold-text)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Quiero información →</a>
        </div>
      ))}
    </div>
  );
}

// ───────── Portal ─────────
export default function Portal() {
  const [session, setSession] = useState(undefined);
  const [data, setData] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | no_cliente | error
  const [tab, setTab] = useState("inicio");
  const [instalar, setInstalar] = useState(false);
  const [promptNativo, setPromptNativo] = useState(null);

  // Identidad de app instalable propia del portal (no la del CRM)
  useEffect(() => {
    document.title = "J L Patrimonial";
    const setLink = (rel, href) => { const l = document.querySelector(`link[rel="${rel}"]`); if (l) l.setAttribute("href", href); };
    setLink("manifest", "/portal-manifest.json");
    const t = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (t) t.setAttribute("content", "J L Patrimonial");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => setSession(d.session));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => l.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setPromptNativo(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  useEffect(() => {
    if (!session) { setData(null); return; }
    let vivo = true;
    (async () => {
      setEstado("cargando");
      const { data: d, error } = await supabase.functions.invoke("portal-cliente", { body: { agentId: AGENTE_ID } });
      if (!vivo) return;
      if (error || !d || d.error) {
        let status = error?.context?.status;
        setEstado(status === 403 || d?.error === "no_cliente" ? "no_cliente" : "error");
        return;
      }
      setData(d);
      setEstado("ok");
      // Aviso para instalar como app: al entrar, salvo que ya esté instalada u oculto
      if (!esStandalone() && leerLS(LS_NO_MOSTRAR) !== "1") setTimeout(() => vivo && setInstalar(true), 700);
    })();
    return () => { vivo = false; };
  }, [session]);

  async function instalarNativo() {
    if (!promptNativo) return;
    promptNativo.prompt();
    try { await promptNativo.userChoice; } catch (e) { /* cancelado */ }
    setPromptNativo(null);
  }

  if (session === undefined) return <div style={{ minHeight: "100dvh", background: "var(--cream)" }} />;
  if (!session) return <Acceso />;

  const salir = async () => { await supabase.auth.signOut(); };
  const centro = (children) => (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--cream)", padding: 20, textAlign: "center", fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <div className="panel" style={{ maxWidth: 380, padding: 24 }}>{children}<button type="button" onClick={salir} style={{ marginTop: 14, background: "none", border: "none", color: "var(--gold-text)", fontWeight: 600, cursor: "pointer" }}>Salir</button></div>
    </div>
  );
  if (estado === "cargando") return centro(<p style={{ color: "var(--muted)" }}>Cargando tu información…</p>);
  if (estado === "no_cliente") return centro(<p style={{ color: "var(--ink)" }}>Este correo no está registrado como cliente. Pídele a tu asesor que lo agregue.</p>);
  if (estado === "error" || !data) return centro(<p style={{ color: "var(--ink)" }}>No pudimos cargar tu información. Intenta de nuevo en unos minutos.</p>);

  const TABS = [
    { id: "inicio", label: "Inicio", icon: Home },
    { id: "polizas", label: "Pólizas", icon: FileText },
    { id: "siniestro", label: "Siniestro", icon: ShieldAlert },
    { id: "asesoria", label: "Asesoría", icon: MessageCircle },
    { id: "productos", label: "Productos", icon: LayoutGrid },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "var(--cream)", fontFamily: "'Manrope', system-ui, sans-serif", paddingBottom: 84 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 10px" }}>
          {ES_JL ? <img src={JL_LOGO} alt="J L Consultoría Patrimonial" style={{ height: 40, objectFit: "contain" }} /> : <span className="serif" style={{ fontSize: 17, color: "var(--ink)" }}>{contactoDe(data).nombre}</span>}
          <div style={{ display: "flex", gap: 6 }}>
            {!esStandalone() && <button type="button" onClick={() => setInstalar(true)} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><Smartphone size={14} /> Instalar app</button>}
            <button type="button" onClick={salir} aria-label="Salir" style={{ border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", borderRadius: 999, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center" }}><LogOut size={14} /></button>
          </div>
        </div>
        {tab === "inicio" && <Inicio data={data} setTab={setTab} />}
        {tab === "polizas" && <Polizas data={data} />}
        {tab === "siniestro" && <Siniestro data={data} />}
        {tab === "asesoria" && <Asesoria data={data} />}
        {tab === "productos" && <Productos data={data} />}
        <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "8px 0 20px" }}>{ES_JL ? "© 2026 J L Consultoría Patrimonial" : "Portal de clientes"}</p>
      </div>

      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "center", paddingBottom: "env(safe-area-inset-bottom)", zIndex: 50 }}>
        <div style={{ display: "flex", width: "100%", maxWidth: 640 }}>
          {TABS.map((t) => {
            const I = t.icon; const on = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }); }} style={{ flex: 1, padding: "9px 2px 8px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--ink)" : "var(--stone)", fontWeight: on ? 700 : 500, fontSize: 11, borderTop: on ? "2px solid var(--gold)" : "2px solid transparent" }}>
                <I size={20} color={on ? "var(--gold-text)" : "currentColor"} />{t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {instalar && <InstalarModal onClose={() => setInstalar(false)} instalarNativo={promptNativo ? instalarNativo : null} />}
    </div>
  );
}
