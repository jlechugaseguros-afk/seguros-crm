import React, { useState, useEffect, useMemo, useRef } from "react";
import { Home, FileText, ShieldAlert, MessageCircle, LayoutGrid, Download, LogOut, X, Share, MoreVertical, Smartphone, CalendarClock, ChevronRight, Phone, Car, HeartPulse, Heart, PawPrint, PiggyBank, Shield, FolderOpen, MoreHorizontal, Camera, ScanFace } from "lucide-react";
import { bioDisponible, bioActivaPara, bioRechazada, bioRechazar, bioActivar, bioVerificar, bioDesactivar } from "./biometria.js";
import { InsurerMark, insurerKey } from "./insurerLogos.jsx";
import { supabasePortal as supabase } from "./supabasePortal.js";
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
  if (ES_JL) return <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />;
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
            <img src="/portal-icon-192.png" alt="" width={44} height={44} style={{ borderRadius: 11 }} />
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

// ───────── Pantalla de acceso (correo + contraseña) y activación con enlace del asesor ─────────
const inputSt = { width: "100%", padding: "13px 14px", border: "2px solid var(--gold)", borderRadius: 10, fontSize: 16, background: "#fff", color: "var(--ink)", marginBottom: 12 };
const btnSt = { width: "100%", padding: "13px 14px", border: "none", borderRadius: 10, background: "var(--ink)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" };
const lblSt = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 };
function leerTokenActivacion() {
  try { const t = new URLSearchParams(window.location.search).get("activar") || ""; return /^[0-9a-f]{48}$/.test(t) ? t : ""; } catch (e) { return ""; }
}
function Marco({ children }) {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--cream)", display: "flex", flexDirection: "column", fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "22px 20px 8px" }}>
        {ES_JL ? <img src={JL_LOGO} alt="J L Consultoría Patrimonial" style={{ height: 110, objectFit: "contain" }} /> : <div className="serif" style={{ fontSize: 26, padding: "26px 0 6px", color: "var(--ink)" }}>Portal de clientes</div>}
      </div>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "12px 16px 32px" }}>
        <div className="panel stagger" style={{ width: "100%", maxWidth: 420, padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}
const AyudaAsesor = () => (
  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 18 }}>
    {ES_JL
      ? <>¿Primera vez o olvidaste tu contraseña? <a href={`https://wa.me/${ASESOR_JL.whatsapp}?text=${encodeURIComponent("Hola Joshua, necesito mi enlace de acceso al portal de clientes.")}`} style={{ color: "var(--gold-text)", fontWeight: 600 }}>Pídeme tu enlace por WhatsApp</a>.</>
      : <>¿Primera vez o olvidaste tu contraseña? Pídele a tu asesor un enlace de acceso.</>}
  </p>
);

function Activar({ token, onListo, onEntro }) {
  const [info, setInfo] = useState(null); // null = cargando, false = inválido
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState("idle");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const { data: d } = await supabase.functions.invoke("portal-activar", { body: { accion: "info", token } });
        setInfo(d && d.correo ? d : false);
      } catch (e) { setInfo(false); }
    })();
  }, [token]);
  async function guardar(e) {
    e.preventDefault();
    if (p1.length < 8) { setMsg("La contraseña debe tener al menos 8 caracteres."); return; }
    if (p1 !== p2) { setMsg("Las contraseñas no coinciden."); return; }
    setMsg(""); setEstado("guardando");
    try {
      const { data: d, error } = await supabase.functions.invoke("portal-activar", { body: { accion: "activar", token, password: p1 } });
      if (error || !d?.ok) { setEstado("idle"); setMsg(d?.error === "cuenta_no_permitida" ? "Esta cuenta no se puede activar desde aquí. Contacta a tu asesor." : "No pudimos activar tu acceso. Pide un enlace nuevo a tu asesor."); return; }
      const { error: e2 } = await supabase.auth.signInWithPassword({ email: d.correo, password: p1 });
      if (e2) { setEstado("idle"); setMsg("Contraseña creada, pero no pudimos iniciar sesión. Intenta entrar con tu correo y contraseña."); return; }
      try { window.history.replaceState({}, "", window.location.pathname); } catch (err) { /* sin historial */ }
      onEntro?.(); onListo();
    } catch (err) { setEstado("idle"); setMsg("Ocurrió un problema. Intenta de nuevo."); }
  }
  return (
    <Marco>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold-text)", fontWeight: 700 }}>Portal de clientes</div>
      {info === null && <p style={{ color: "var(--muted)", marginTop: 14 }}>Verificando tu enlace…</p>}
      {info === false && (
        <>
          <h1 className="serif" style={{ fontSize: 24, color: "var(--ink)", margin: "6px 0" }}>Enlace no válido</h1>
          <p style={{ fontSize: 14, color: "var(--muted)" }}>Este enlace ya se usó o caducó. Pídele a tu asesor uno nuevo.</p>
          <button type="button" onClick={onListo} style={{ ...btnSt, marginTop: 14 }}>Ir a iniciar sesión</button>
        </>
      )}
      {info && (
        <form onSubmit={guardar}>
          <h1 className="serif" style={{ fontSize: 26, color: "var(--ink)", margin: "6px 0 6px", lineHeight: 1.15 }}>Hola{info.nombre ? `, ${info.nombre}` : ""}</h1>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>Crea tu contraseña para entrar a tu portal. Tu usuario será <b>{info.correo}</b>.</p>
          <label style={lblSt}>Contraseña (mínimo 8 caracteres)</label>
          <input type={ver ? "text" : "password"} required minLength={8} autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} style={inputSt} />
          <label style={lblSt}>Repite la contraseña</label>
          <input type={ver ? "text" : "password"} required minLength={8} autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} style={inputSt} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseña
          </label>
          <button type="submit" disabled={estado === "guardando"} style={{ ...btnSt, opacity: estado === "guardando" ? 0.6 : 1 }}>{estado === "guardando" ? "Guardando…" : "Crear contraseña y entrar"}</button>
          {msg && <p style={{ fontSize: 12, color: "#B23A2E", marginTop: 10 }}>{msg}</p>}
        </form>
      )}
    </Marco>
  );
}

function Acceso({ onEntro }) {
  const [token, setToken] = useState(leerTokenActivacion());
  const [email, setEmail] = useState(leerLS("jl_portal_correo") || "");
  const [pass, setPass] = useState("");
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState("idle");
  const [msg, setMsg] = useState("");
  if (token) return <Activar token={token} onListo={() => setToken("")} onEntro={onEntro} />;
  async function entrar(e) {
    e.preventDefault();
    setEstado("entrando"); setMsg("");
    const correo = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: pass });
    if (error) { setEstado("idle"); setMsg("Correo o contraseña incorrectos."); return; }
    escribirLS("jl_portal_correo", correo);
    onEntro?.();
  }
  return (
    <Marco>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold-text)", fontWeight: 700 }}>Portal de clientes</div>
      <h1 className="serif" style={{ fontSize: 26, color: "var(--ink)", margin: "6px 0 6px", lineHeight: 1.15 }}>Tus pólizas, siempre contigo</h1>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18 }}>Entra con tu correo y tu contraseña.</p>
      <form onSubmit={entrar}>
        <label style={lblSt}>Correo electrónico</label>
        <input type="email" required autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" style={inputSt} />
        <label style={lblSt}>Contraseña</label>
        <input type={ver ? "text" : "password"} required autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} style={{ ...inputSt, marginBottom: 8 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseña
        </label>
        <button type="submit" disabled={estado === "entrando"} style={{ ...btnSt, opacity: estado === "entrando" ? 0.6 : 1 }}>{estado === "entrando" ? "Entrando…" : "Entrar"}</button>
        {msg && <p style={{ fontSize: 12, color: "#B23A2E", marginTop: 10 }}>{msg}</p>}
      </form>
      <AyudaAsesor />
    </Marco>
  );
}

// ───────── Bloqueo con Face ID / huella ─────────
function Bloqueo({ uid, onOk, onSalir }) {
  const [fallo, setFallo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  async function probar() {
    setOcupado(true); setFallo(false);
    const ok = await bioVerificar(uid);
    setOcupado(false);
    if (ok) onOk(); else setFallo(true);
  }
  useEffect(() => { probar(); /* intento automático al abrir */ }, []);
  return (
    <Marco>
      <div style={{ textAlign: "center" }}>
        <span style={{ width: 64, height: 64, borderRadius: 20, background: "var(--gold-soft)", color: "var(--gold-text)", display: "inline-grid", placeItems: "center" }}><ScanFace size={32} /></span>
        <h1 className="serif" style={{ fontSize: 24, color: "var(--ink)", margin: "12px 0 6px" }}>Tu portal está protegido</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>Confirma con Face ID o tu huella para entrar.</p>
        <button type="button" onClick={probar} disabled={ocupado} style={{ ...btnSt, opacity: ocupado ? 0.6 : 1 }}>{ocupado ? "Verificando…" : "Desbloquear"}</button>
        {fallo && <p style={{ fontSize: 12, color: "#B23A2E", marginTop: 10 }}>No se pudo verificar. Intenta de nuevo.</p>}
        <button type="button" onClick={onSalir} style={{ marginTop: 14, background: "none", border: "none", color: "var(--gold-text)", fontWeight: 600, cursor: "pointer" }}>Usar contraseña</button>
      </div>
    </Marco>
  );
}

function BioOferta({ onActivar, onCerrar }) {
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState(false);
  return (
    <div role="dialog" aria-modal="true" onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(7,29,49,.62)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, padding: 22, animation: "rise .4s cubic-bezier(.2,.7,.2,1)" }}>
        <span style={{ width: 52, height: 52, borderRadius: 16, background: "var(--gold-soft)", color: "var(--gold-text)", display: "grid", placeItems: "center" }}><ScanFace size={28} /></span>
        <h3 className="serif" style={{ fontSize: 20, color: "var(--ink)", margin: "12px 0 4px" }}>Entra más rápido</h3>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>Activa Face ID o tu huella para abrir tu portal sin escribir la contraseña. Solo funciona en este dispositivo.</p>
        {fallo && <p style={{ fontSize: 12, color: "#B23A2E", marginTop: 8 }}>No se pudo activar. Puedes intentarlo después desde “Más”.</p>}
        <button type="button" disabled={ocupado} onClick={async () => { setOcupado(true); setFallo(false); const ok = await onActivar(); setOcupado(false); if (!ok) setFallo(true); }} style={{ ...btnSt, marginTop: 14, opacity: ocupado ? 0.6 : 1 }}>{ocupado ? "Activando…" : "Activar Face ID / huella"}</button>
        <button type="button" onClick={onCerrar} style={{ width: "100%", marginTop: 8, padding: "11px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "#fff", color: "var(--ink)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Ahora no</button>
      </div>
    </div>
  );
}

// ───────── Secciones ─────────
// ───────── Vistas (diseño tipo app: categorías, tarjetas de póliza, tu agente) ─────────
const RAMO_META = {
  Autos: { icon: Car, color: "#0B2A44", bg: "#E4ECF3", label: "Autos" },
  GMM: { icon: HeartPulse, color: "#1E5C4C", bg: "#E1EFEA", label: "GMM" },
  Vida: { icon: Heart, color: "#B23A2E", bg: "#F7E4E1", label: "Vida" },
  Hogar: { icon: Home, color: "#A87A12", bg: "#F6EBCB", label: "Hogar" },
  Mascotas: { icon: PawPrint, color: "#6B4E9B", bg: "#ECE6F5", label: "Mascotas" },
  "Plan Personal de Retiro (PPR)": { icon: PiggyBank, color: "#0E7C66", bg: "#DFF1EC", label: "Retiro" },
};
const ramoMeta = (r) => RAMO_META[r] || { icon: Shield, color: "#4F5E6B", bg: "#E8ECEB", label: r || "Otro" };
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtCorta = (s) => { if (!s) return "—"; const [y, m, d] = s.split("-").map(Number); return `${d} ${MESES_CORTO[m - 1]} ${y}`; };
function estadoPoliza(p) {
  if (!p.finVigencia) return { t: "Vigente", c: "var(--emerald)" };
  const d = diasPara(p.finVigencia);
  if (d < 0) return { t: "Vencida", c: "#B23A2E" };
  if (d <= 30) return { t: "Por vencer", c: "var(--gold-text)" };
  return { t: "Vigente", c: "var(--emerald)" };
}

function TuAgente({ data }) {
  const c = contactoDe(data);
  const foto = data?.agente?.fotoUrl;
  const tel = String(data?.agente?.telefono || data?.agente?.whatsapp || (ES_JL ? ASESOR_JL.whatsapp : "")).replace(/\D/g, "");
  const telDigits = tel.length === 10 ? "52" + tel : tel;
  const accion = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px", borderRadius: 12, background: "var(--cream)", color: "var(--ink)", fontSize: 11, fontWeight: 600, textDecoration: "none", border: "none", cursor: "pointer" };
  return (
    <div className="panel" style={{ padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
      {foto
        ? <img src={foto} alt={c.nombre} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--gold-soft)" }} />
        : <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--ink)", color: "var(--gold)", display: "grid", placeItems: "center", fontFamily: "'Fraunces', serif", fontSize: 22, flexShrink: 0 }}>{(c.nombre || "A").charAt(0)}</span>}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--gold-text)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Tu agente</div>
        <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15, lineHeight: 1.2 }}>{c.nombre}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.3, marginTop: 2 }}>{c.titulo}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {telDigits && <a href={`tel:+${telDigits}`} style={accion}><Phone size={18} />Llamar</a>}
        <a href={enlace(data, `Hola ${primerNombre(c)}, soy ${data.cliente.nombre}. `)} target="_blank" rel="noreferrer" style={accion}><MessageCircle size={18} />Escribir</a>
      </div>
    </div>
  );
}

function MisSeguros({ data, setTab, irSiniestro, fotos = {}, onFoto }) {
  const ps = data.polizas || [];
  const ramos = useMemo(() => {
    const cnt = new Map(["Autos", "GMM", "Vida", "Hogar", "Mascotas", "Plan Personal de Retiro (PPR)"].map((r) => [r, 0]));
    ps.forEach((p) => cnt.set(p.ramo, (cnt.get(p.ramo) || 0) + 1));
    return [...cnt.entries()];
  }, [ps]);
  const [sel, setSel] = useState("Todas");
  const [abierta, setAbierta] = useState(null);
  const [gastos, setGastos] = useState("300000");
  const lista = sel === "Todas" ? ps : ps.filter((p) => p.ramo === sel);
  const nombre = (data.cliente.nombre || "").split(" ")[0];
  const proximo = useMemo(() => {
    const hoy = hoyStr(); const pagos = [];
    ps.forEach((p) => pagosDePoliza(p).forEach((g) => { if (g.date >= hoy) pagos.push({ ...g, p }); }));
    pagos.sort((a, b) => a.date.localeCompare(b.date));
    return pagos[0];
  }, [ps]);
  const tituloSel = sel === "Todas" ? "Todas mis pólizas" : `Mis pólizas de ${ramoMeta(sel).label}`;
  const acc = { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "9px 2px", borderRadius: 12, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", fontSize: 11, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center" };

  return (
    <div className="stagger">
      <div style={{ margin: "4px 0 14px" }}>
        <h1 className="serif" style={{ fontSize: 26, color: "var(--ink)", lineHeight: 1.15 }}>Hola, {nombre}</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Tus seguros, a unos toques.</p>
      </div>

      {proximo && (
        <button type="button" onClick={() => setTab("pagos")} className="panel" style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: "12px 14px", marginBottom: 14, borderLeft: "4px solid var(--gold)", display: "flex", alignItems: "center", gap: 12 }}>
          <CalendarClock size={20} color="var(--gold-text)" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 11, color: "var(--gold-text)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Próximo pago</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{proximo.p.aseguradora} · {fmtCorta(proximo.date)} <b style={{ color: diasPara(proximo.date) <= 3 ? "#B23A2E" : "var(--emerald)" }}>({cuando(diasPara(proximo.date))})</b></span>
          </span>
          <span className="serif" style={{ fontSize: 19, color: "var(--ink)", whiteSpace: "nowrap" }}>{mxn(proximo.monto)}</span>
        </button>
      )}

      {ramos.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 2px 10px", margin: "0 -2px" }}>
          {[["Todas", ps.length], ...ramos].map(([r, n]) => {
            const m = r === "Todas" ? { icon: LayoutGrid, color: "var(--ink)", bg: "var(--cream-2)", label: "Todas" } : ramoMeta(r);
            const I = m.icon; const on = sel === r;
            return (
              <button key={r} type="button" onClick={() => setSel(r)} style={{ position: "relative", flex: "0 0 auto", minWidth: 74, padding: "10px 10px 8px", borderRadius: 14, border: on ? "2px solid var(--emerald)" : "1px solid var(--line)", background: on ? "#EEF7F3" : "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", transition: "transform .2s", transform: on ? "translateY(-2px)" : "none", opacity: n === 0 && !on ? 0.72 : 1 }}>
                <span style={{ position: "absolute", top: 5, right: 8, fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>{n}</span>
                <I size={24} color={m.color} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "6px 2px 10px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{tituloSel} ({lista.length})</h3>
        {sel !== "Todas" && ramos.length > 1 && <button type="button" onClick={() => setSel("Todas")} style={{ background: "none", border: "none", color: "var(--emerald)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Ver todas ›</button>}
      </div>

      {ps.length === 0 && sel === "Todas" && <div className="panel" style={{ padding: 16, fontSize: 14, color: "var(--muted)", marginBottom: 14 }}>Aún no hay pólizas registradas en tu cuenta.</div>}

      {lista.length === 0 && sel !== "Todas" && (() => {
        const m = ramoMeta(sel); const I = m.icon;
        return (
          <div className="panel" style={{ padding: 18, marginBottom: 14, textAlign: "center" }}>
            <span style={{ width: 54, height: 54, borderRadius: 16, background: m.bg, display: "inline-grid", placeItems: "center" }}><I size={28} color={m.color} /></span>
            <div style={{ fontWeight: 700, color: "var(--ink)", marginTop: 10 }}>Aún no tienes un seguro de {m.label}</div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 12px" }}>Pídele a tu agente una cotización, sin compromiso.</p>
            <a href={enlace(data, `Hola ${primerNombre(contactoDe(data))}, soy ${data.cliente.nombre}. Me gustaría cotizar un seguro de ${m.label}.`)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--gold)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 18px", borderRadius: 10, textDecoration: "none" }}><MessageCircle size={16} /> Quiero cotizar</a>
          </div>
        );
      })()}

      {lista.map((p) => {
        const m = ramoMeta(p.ramo); const I = m.icon; const st = estadoPoliza(p); const open = abierta === p.id;
        const esGmm = p.ramo === "GMM" && Number(p.deducible) > 0;
        const calc = esGmm ? calcularDyC({ gastos: Number(String(gastos).replace(/[^0-9.]/g, "")) || 0, deducible: Number(p.deducible), coaseguroPct: Number(p.coaseguroPct) || 0, tope: Number(p.topeCoaseguro) || 0 }) : null;
        const fila = (k, v) => v ? <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>{k}</span><span style={{ color: "var(--ink)", fontWeight: 600, textAlign: "right" }}>{v}</span></div> : null;
        return (
          <div key={p.id} className="panel" style={{ marginBottom: 12, padding: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label aria-label="Poner o cambiar la foto" style={{ position: "relative", width: 62, height: 62, flexShrink: 0, cursor: "pointer" }}>
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f && onFoto) onFoto(p.id, f); }} />
                {fotos[p.id]
                  ? <img src={fotos[p.id]} alt="" style={{ width: 62, height: 62, borderRadius: 14, objectFit: "cover", display: "block" }} />
                  : <span style={{ width: 62, height: 62, borderRadius: 14, background: m.bg, display: "grid", placeItems: "center" }}><I size={30} color={m.color} /></span>}
                <span style={{ position: "absolute", right: -4, bottom: -4, width: 22, height: 22, borderRadius: "50%", background: "var(--ink)", color: "#fff", display: "grid", placeItems: "center", border: "2px solid #fff" }}><Camera size={11} /></span>
              </label>
              <button type="button" onClick={() => setAbierta(open ? null : p.id)} style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, display: "flex", gap: 8, alignItems: "center", textAlign: "left", cursor: "pointer" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, color: "var(--ink)", fontSize: 16 }}>{m.label}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Póliza: {p.numeroPoliza || "sin número"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <InsurerMark name={p.aseguradora} w={44} h={22} radius={6} fontSize={11} />
                  <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>{p.aseguradora}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12 }}>
                  <i style={{ width: 8, height: 8, borderRadius: "50%", background: st.c, display: "inline-block" }} />
                  <b style={{ color: st.c }}>{st.t}</b>
                  <span style={{ color: "var(--muted)" }}>Vence: {fmtCorta(p.finVigencia)}</span>
                </span>
              </span>
              <ChevronRight size={18} color="var(--muted)" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
            </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
              {p.docUrl
                ? <a href={p.docUrl} target="_blank" rel="noreferrer" style={{ ...acc, borderColor: "var(--gold)", background: "var(--gold-soft)" }}><FileText size={19} color="var(--gold-text)" />Ver póliza<span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>PDF</span></a>
                : <span style={{ ...acc, opacity: 0.45, cursor: "default" }}><FileText size={19} />Ver póliza<span style={{ fontSize: 9, fontWeight: 600 }}>Sin PDF</span></span>}
              <button type="button" onClick={() => setTab("pagos")} style={acc}><CalendarClock size={19} color="var(--gold-text)" />Pagos<span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>Calendario</span></button>
              <button type="button" onClick={() => irSiniestro(p.id)} style={acc}><ShieldAlert size={19} color="var(--gold-text)" />Siniestro<span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>Reportar</span></button>
              <a href={enlace(data, `Hola ${primerNombre(contactoDe(data))}, soy ${data.cliente.nombre}. Tengo una duda sobre mi póliza ${p.aseguradora} ${p.ramo} ${p.numeroPoliza || ""}.`)} target="_blank" rel="noreferrer" style={acc}><MessageCircle size={19} color="var(--gold-text)" />Asesor<span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>Escribir</span></a>
            </div>

            {open && (
              <div style={{ marginTop: 10, animation: "rise .3s cubic-bezier(.2,.7,.2,1)" }}>
                {fila("Inicio de vigencia", fmtFecha(p.inicioVigencia))}
                {fila("Fin de vigencia", fmtFecha(p.finVigencia))}
                {fila("Prima anual", p.primaAnual ? `${mxn(p.primaAnual)} ${p.moneda || ""}` : "")}
                {fila("Forma de pago", p.pagoFraccionado)}
                {fila("Método de pago", p.metodoPago)}
                {fila("Siguiente pago", p.fechaPago ? fmtFecha(p.fechaPago) : "")}
                {esGmm && (
                  <div style={{ marginTop: 12, background: "var(--cream)", borderRadius: 12, padding: 12 }}>
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

      <TuAgente data={data} />
    </div>
  );
}

function Documentos({ data }) {
  const ps = (data.polizas || []);
  const con = ps.filter((p) => p.docUrl);
  return (
    <div className="stagger">
      <div style={{ margin: "4px 0 14px" }}>
        <h1 className="serif" style={{ fontSize: 26, color: "var(--ink)" }}>Documentos</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Tus pólizas en PDF, siempre a la mano.</p>
      </div>
      {con.length === 0 && <div className="panel" style={{ padding: 16, fontSize: 14, color: "var(--muted)", marginBottom: 14 }}>Todavía no hay documentos cargados en tu cuenta.</div>}
      {con.map((p) => {
        const m = ramoMeta(p.ramo); const I = m.icon;
        return (
          <a key={p.id} href={p.docUrl} target="_blank" rel="noreferrer" className="panel" style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, marginBottom: 10, textDecoration: "none", color: "inherit" }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, background: m.bg, display: "grid", placeItems: "center", flexShrink: 0 }}><I size={22} color={m.color} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>Póliza {m.label} · {p.aseguradora}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{p.numeroPoliza || "sin número"} · vence {fmtCorta(p.finVigencia)}</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--ink)", color: "#fff", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 700 }}><Download size={14} /> PDF</span>
          </a>
        );
      })}
      <div className="panel" style={{ padding: 14, marginTop: 6, marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
        ¿Necesitas carátula, endosos u otro documento? <a href={enlace(data, `Hola ${primerNombre(contactoDe(data))}, soy ${data.cliente.nombre}. Necesito un documento de mi póliza.`)} target="_blank" rel="noreferrer" style={{ color: "var(--gold-text)", fontWeight: 700 }}>Pídeselo a tu agente</a>.
      </div>
      <TuAgente data={data} />
    </div>
  );
}

function Pagos({ data }) {
  const { proximos, renovaciones } = useMemo(() => {
    const hoy = hoyStr(); const pagos = [];
    (data.polizas || []).forEach((p) => pagosDePoliza(p).forEach((g) => { if (g.date >= hoy) pagos.push({ ...g, p }); }));
    pagos.sort((a, b) => a.date.localeCompare(b.date));
    const ren = (data.polizas || []).filter((p) => p.finVigencia && p.finVigencia >= hoy).sort((a, b) => a.finVigencia.localeCompare(b.finVigencia));
    return { proximos: pagos.slice(0, 12), renovaciones: ren };
  }, [data]);
  return (
    <div className="stagger">
      <h1 className="serif" style={{ fontSize: 26, color: "var(--ink)", margin: "4px 0 12px" }}>Calendario de pagos</h1>
      <div className="panel" style={{ overflow: "hidden", marginBottom: 16 }}>
        {proximos.length === 0 && <div style={{ padding: 14, fontSize: 14, color: "var(--muted)" }}>No hay pagos próximos registrados.</div>}
        {proximos.map((g, i) => (
          <div key={g.p.id + g.date} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "11px 14px", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 13 }}>
            <div><div style={{ fontWeight: 600, color: "var(--ink)" }}>{g.p.aseguradora} · {ramoMeta(g.p.ramo).label}</div><div style={{ color: "var(--muted)", fontSize: 12 }}>{fmtCorta(g.date)} · pago {g.numero} de {g.total} · {cuando(diasPara(g.date))}</div></div>
            <div style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{mxn(g.monto)}</div>
          </div>
        ))}
      </div>
      {renovaciones.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 2px 10px" }}>Vigencias</h3>
          <div className="panel" style={{ overflow: "hidden", marginBottom: 16 }}>
            {renovaciones.map((p, i) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "11px 14px", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{p.aseguradora} · {ramoMeta(p.ramo).label}</div>
                <div style={{ color: "var(--muted)" }}>vence {fmtCorta(p.finVigencia)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Mas({ data, setTab, salir, abrirInstalar, bioOk, bioOn, alternarBio }) {
  const item = (icon, titulo, sub, onClick, color = "var(--gold-text)") => {
    const I = icon;
    return (
      <button type="button" onClick={onClick} className="panel" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", marginBottom: 10, cursor: "pointer", textAlign: "left" }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--cream)", display: "grid", placeItems: "center", flexShrink: 0 }}><I size={19} color={color} /></span>
        <span style={{ flex: 1 }}><span style={{ display: "block", fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{titulo}</span><span style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</span></span>
        <ChevronRight size={17} color="var(--muted)" />
      </button>
    );
  };
  return (
    <div className="stagger">
      <h1 className="serif" style={{ fontSize: 26, color: "var(--ink)", margin: "4px 0 12px" }}>Más</h1>
      {item(CalendarClock, "Calendario de pagos", "Tus próximos pagos y vigencias", () => setTab("pagos"))}
      {item(MessageCircle, "Pedir asesoría", "Resuelve tus dudas con tu agente", () => setTab("asesoria"))}
      {item(LayoutGrid, "Otros productos", "Conoce toda la gama de servicios", () => setTab("productos"))}
      {bioOk && item(ScanFace, "Face ID / huella", bioOn ? "Activado en este dispositivo · toca para desactivar" : "Entra sin escribir tu contraseña", alternarBio)}
      {!esStandalone() && item(Smartphone, "Instalar la app", "Agrégala a tu pantalla de inicio", abrirInstalar)}
      {item(LogOut, "Cerrar sesión", data.cliente.nombre, salir, "var(--muted)")}
      <TuAgente data={data} />
    </div>
  );
}

// Reduce la foto a un máximo de 480 px para guardarla ligera
function reducirFoto(file, max = 480) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagen")); };
    img.src = url;
  });
}

// Teléfonos de siniestros por aseguradora (confirma siempre el número de tu póliza)
const TEL_SINIESTROS = [
  { nombre: "AXA", tels: [["", "800 911 1292"]] },
  { nombre: "Qualitas", tels: [["", "800 800 2880"]] },
  { nombre: "Chubb", tels: [["", "800 223 2001"]] },
  { nombre: "Banorte", tels: [["", "800 500 1500"]] },
  { nombre: "Plan Seguro", tels: [["", "800 277 1234"]] },
  { nombre: "HDI", tels: [["", "800 667 3144"]] },
  { nombre: "Mapfre", tels: [["", "800 062 7373"]] },
  { nombre: "ANA", tels: [["", "800 835 3262"]] },
  { nombre: "Afirme", tels: [["MTY", "81 8318 3800"], ["CDMX", "55 5140 3000"], ["Zapopan", "33 3880 7400"], ["Chihuahua", "614 432 6210"], ["Resto del país", "800 734 8761"]] },
];
function TelefonosSiniestros({ data }) {
  const [todas, setTodas] = useState(false);
  const mias = new Set((data.polizas || []).map((p) => insurerKey(p.aseguradora)).filter(Boolean));
  const fuente = Array.isArray(data.siniestros) && data.siniestros.length
    ? data.siniestros.map((x) => ({ nombre: x.aseguradora, tels: (x.telefonos || []).map((t) => [t.lugar || "", t.numero]), instrucciones: x.instrucciones || "", docs: x.docs || [] }))
    : TEL_SINIESTROS;
  const ordenadas = [...fuente].sort((a, b) => (mias.has(insurerKey(b.nombre)) ? 1 : 0) - (mias.has(insurerKey(a.nombre)) ? 1 : 0));
  const hayMias = ordenadas.some((a) => mias.has(insurerKey(a.nombre)));
  const visibles = todas || !hayMias ? ordenadas : ordenadas.filter((a) => mias.has(insurerKey(a.nombre)));
  const tel = (t) => `tel:${t.replace(/\D/g, "")}`;
  return (
    <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
      <h3 className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>Teléfonos de siniestros</h3>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 12px", lineHeight: 1.45 }}>Si sufres un siniestro, comunícate con tu agente o directamente con tu aseguradora. Toca un número para llamar.</p>
      <div style={{ display: "grid", gap: 8 }}>
        {visibles.map((a) => (
          <div key={a.nombre} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid " + (mias.has(insurerKey(a.nombre)) ? "var(--gold)" : "var(--line)"), borderRadius: 14, background: mias.has(insurerKey(a.nombre)) ? "var(--gold-soft)" : "#fff" }}>
            <InsurerMark name={a.nombre} w={52} h={30} radius={8} fontSize={12} />
            <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
              {mias.has(insurerKey(a.nombre)) && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-text)" }}>Tu aseguradora</span>}
              {a.tels.map(([lugar, n]) => (
                <a key={n} href={tel(n)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, color: "var(--ink)", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
                  <span style={{ fontSize: lugar ? 12 : 15, fontWeight: lugar ? 600 : 700, color: lugar ? "var(--muted)" : "var(--ink)" }}>{lugar || n}</span>
                  {lugar && <span>{n}</span>}
                  {!lugar && <Phone size={16} color="var(--emerald)" />}
                </a>
              ))}
              {a.instrucciones && <p style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.45, margin: "4px 0 0", whiteSpace: "pre-line" }}>{a.instrucciones}</p>}
              {(a.docs || []).map((d) => <a key={d.id} href={d.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--gold-text)", textDecoration: "none" }}><FileText size={14} /> {d.name}</a>)}
            </div>
          </div>
        ))}
      </div>
      {hayMias && <button type="button" onClick={() => setTodas((v) => !v)} style={{ background: "none", border: "none", color: "var(--gold-text)", fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 10, padding: 0 }}>{todas ? "Ver solo mis aseguradoras" : "Ver todas las aseguradoras"}</button>}
    </div>
  );
}

function Siniestro({ data, pid0 }) {
  const ps = data.polizas || [];
  const [pid, setPid] = useState(pid0 || ps[0]?.id || "");
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
      <TelefonosSiniestros data={data} />
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
  const [tab, setTab] = useState("seguros");
  const [pidSiniestro, setPidSiniestro] = useState("");
  const [fotos, setFotos] = useState({});
  const [instalar, setInstalar] = useState(false);
  const [promptNativo, setPromptNativo] = useState(null);
  const [desbloq, setDesbloq] = useState(false);
  const [bioOferta, setBioOferta] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioOk, setBioOk] = useState(false);
  const instalarPend = useRef(false);

  // Identidad de app instalable propia del portal (no la del CRM)
  useEffect(() => {
    document.title = "Portal de clientes";
    const setLink = (rel, href) => { const l = document.querySelector(`link[rel="${rel}"]`); if (l) l.setAttribute("href", href); };
    setLink("manifest", "/portal-manifest.json");
    const t = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (t) t.setAttribute("content", "Portal de clientes");
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

  // Se carga una sola vez por usuario: los eventos de sesión (volver a la pestaña, renovar el token)
  // ya no reinician la app.
  const uid = session?.user?.id || "";
  useEffect(() => { bioDisponible().then(setBioOk); }, []);
  useEffect(() => { setBioOn(uid ? bioActivaPara(uid) : false); }, [uid]);
  // Si la app estuvo oculta más de 2 minutos, vuelve a pedir Face ID / huella
  useEffect(() => {
    let t0 = 0;
    const h = () => {
      if (document.hidden) { t0 = Date.now(); return; }
      if (t0 && Date.now() - t0 > 120000 && uid && bioActivaPara(uid)) setDesbloq(false);
      t0 = 0;
    };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [uid]);
  const yaCargado = useRef(false);
  useEffect(() => {
    if (!uid) { setData(null); setFotos({}); yaCargado.current = false; return; }
    let vivo = true;
    (async () => {
      if (!yaCargado.current) setEstado("cargando");
      const { data: d, error } = await supabase.functions.invoke("portal-cliente", { body: { agentId: AGENTE_ID } });
      if (!vivo) return;
      if (error || !d || d.error) {
        const status = error?.context?.status;
        if (!yaCargado.current) setEstado(status === 403 || d?.error === "no_cliente" ? "no_cliente" : "error");
        return;
      }
      setData(d);
      setEstado("ok");
      try {
        const { data: rows } = await supabase.from("portal_fotos").select("poliza_id, foto");
        if (vivo && rows) setFotos(Object.fromEntries(rows.map((r) => [r.poliza_id, r.foto])));
      } catch (e) { /* sin fotos */ }
      // Aviso para instalar como app: al entrar, salvo que ya esté instalada u oculto
      if (!yaCargado.current) {
        const quiereInstalar = !esStandalone() && leerLS(LS_NO_MOSTRAR) !== "1";
        const disp = await bioDisponible();
        if (!vivo) return;
        if (disp && !bioActivaPara(uid) && !bioRechazada()) { instalarPend.current = quiereInstalar; setTimeout(() => vivo && setBioOferta(true), 700); }
        else if (quiereInstalar) setTimeout(() => vivo && setInstalar(true), 700);
        setDesbloq(true);
      }
      yaCargado.current = true;
    })();
    return () => { vivo = false; };
  }, [uid]);

  async function guardarFoto(polizaId, file) {
    try {
      const url = await reducirFoto(file, 480);
      setFotos((f) => ({ ...f, [polizaId]: url }));
      await supabase.from("portal_fotos").upsert({ user_id: uid, poliza_id: polizaId, foto: url, updated_at: new Date().toISOString() });
    } catch (e) { /* no se pudo guardar la foto */ }
  }

  async function instalarNativo() {
    if (!promptNativo) return;
    promptNativo.prompt();
    try { await promptNativo.userChoice; } catch (e) { /* cancelado */ }
    setPromptNativo(null);
  }

  if (session === undefined) return <div style={{ minHeight: "100dvh", background: "var(--cream)" }} />;
  if (!session) return <Acceso onEntro={() => setDesbloq(true)} />;
  if (bioActivaPara(uid) && !desbloq) return <Bloqueo uid={uid} onOk={() => setDesbloq(true)} onSalir={async () => { await supabase.auth.signOut(); }} />;

  const salir = async () => { setDesbloq(false); await supabase.auth.signOut(); };
  const activarBio = async () => {
    const ok = await bioActivar(uid, session?.user?.email || "cliente");
    if (ok) { setBioOn(true); setBioOferta(false); if (instalarPend.current) { instalarPend.current = false; setTimeout(() => setInstalar(true), 400); } }
    return ok;
  };
  const cerrarBioOferta = () => { bioRechazar(); setBioOferta(false); if (instalarPend.current) { instalarPend.current = false; setTimeout(() => setInstalar(true), 400); } };
  const alternarBio = async () => { if (bioOn) { bioDesactivar(); setBioOn(false); } else await activarBio(); };
  const centro = (children) => (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--cream)", padding: 20, textAlign: "center", fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <div className="panel" style={{ maxWidth: 380, padding: 24 }}>{children}<button type="button" onClick={salir} style={{ marginTop: 14, background: "none", border: "none", color: "var(--gold-text)", fontWeight: 600, cursor: "pointer" }}>Salir</button></div>
    </div>
  );
  if (estado === "cargando") return centro(<p style={{ color: "var(--muted)" }}>Cargando tu información…</p>);
  if (estado === "no_cliente") return centro(<p style={{ color: "var(--ink)" }}>Este correo no está registrado como cliente. Pídele a tu asesor que lo agregue.</p>);
  if (estado === "error" || !data) return centro(<p style={{ color: "var(--ink)" }}>No pudimos cargar tu información. Intenta de nuevo en unos minutos.</p>);

  const TABS = [
    { id: "seguros", label: "Mis seguros", icon: Shield },
    { id: "documentos", label: "Documentos", icon: FolderOpen },
    { id: "siniestro", label: "Siniestros", icon: ShieldAlert },
    { id: "mas", label: "Más", icon: MoreHorizontal },
  ];
  const SUBMENU = ["pagos", "asesoria", "productos"];
  const activa = SUBMENU.includes(tab) ? "mas" : tab;
  const irSiniestro = (pid) => { setPidSiniestro(pid); setTab("siniestro"); window.scrollTo({ top: 0 }); };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--cream)", fontFamily: "'Manrope', system-ui, sans-serif", paddingBottom: 84 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 10px" }}>
          {ES_JL ? <img src={JL_LOGO} alt="J L Consultoría Patrimonial" style={{ height: 44, objectFit: "contain" }} /> : <span className="serif" style={{ fontSize: 17, color: "var(--ink)" }}>{contactoDe(data).nombre}</span>}
          <button type="button" onClick={() => setTab("mas")} aria-label="Mi cuenta" style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "var(--emerald)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>{(data.cliente.nombre || "?").charAt(0).toUpperCase()}</button>
        </div>
        {SUBMENU.includes(tab) && (
          <button type="button" onClick={() => setTab("mas")} style={{ background: "none", border: "none", color: "var(--gold-text)", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "0 0 8px" }}>‹ Más</button>
        )}
        {tab === "seguros" && <MisSeguros data={data} setTab={setTab} irSiniestro={irSiniestro} fotos={fotos} onFoto={guardarFoto} />}
        {tab === "documentos" && <Documentos data={data} />}
        {tab === "siniestro" && <Siniestro key={pidSiniestro} data={data} pid0={pidSiniestro} />}
        {tab === "mas" && <Mas data={data} setTab={setTab} salir={salir} abrirInstalar={() => setInstalar(true)} bioOk={bioOk} bioOn={bioOn} alternarBio={alternarBio} />}
        {tab === "pagos" && <Pagos data={data} />}
        {tab === "asesoria" && <Asesoria data={data} />}
        {tab === "productos" && <Productos data={data} />}
        <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "8px 0 20px" }}>{ES_JL ? "© 2026 J L Consultoría Patrimonial" : "Portal de clientes"}</p>
      </div>

      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "center", paddingBottom: "env(safe-area-inset-bottom)", zIndex: 50 }}>
        <div style={{ display: "flex", width: "100%", maxWidth: 640 }}>
          {TABS.map((t) => {
            const I = t.icon; const on = activa === t.id;
            return (
              <button key={t.id} type="button" onClick={() => { if (t.id === "siniestro") setPidSiniestro(""); setTab(t.id); window.scrollTo({ top: 0 }); }} style={{ flex: 1, padding: "9px 2px 8px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--ink)" : "var(--stone)", fontWeight: on ? 700 : 500, fontSize: 11, borderTop: on ? "2px solid var(--gold)" : "2px solid transparent" }}>
                <I size={20} color={on ? "var(--gold-text)" : "currentColor"} />{t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {bioOferta && <BioOferta onActivar={activarBio} onCerrar={cerrarBioOferta} />}
      {instalar && <InstalarModal onClose={() => setInstalar(false)} instalarNativo={promptNativo ? instalarNativo : null} />}
    </div>
  );
}
