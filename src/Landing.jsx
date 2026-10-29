import React, { useState, useEffect } from "react";
import { Shield, Landmark, PiggyBank, Gem, Home, MessageCircle, Mail, ArrowRight, Check, Smartphone, FileText, Bell, ClipboardCheck } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { JL_LOGO } from "./brandAssets.js";
import { registrarEvento } from "./landingTrack.js";

// Datos de contacto (editar aquí)
const WHATSAPP = "522441071011";
const WHATSAPP_VISIBLE = "244 107 1011";
const CORREO = "jlechuga.seguros@gmail.com";
const wa = (t) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t)}`;

const AREAS = [
  { icon: Shield, t: "Protección", d: "Vida, gastos médicos mayores, autos y accidentes: la base para que un imprevisto no frene tu vida ni la de tu familia.", items: ["Seguro de vida", "Gastos médicos mayores", "Autos"] },
  { icon: Landmark, t: "Seguridad social", d: "Entiende tus derechos y mejora tu pensión con asesoría clara sobre el IMSS y tu vivienda.", items: ["Pensión IMSS", "Modalidad 10", "INFONAVIT"] },
  { icon: PiggyBank, t: "Retiro", d: "Construye hoy el ingreso con el que quieres vivir mañana, con beneficio fiscal.", items: ["Plan Personal de Retiro (PPR)", "Ahorro a largo plazo"] },
  { icon: Gem, t: "Patrimonio", d: "Planeación para proteger, hacer crecer y heredar lo que has construido.", items: ["Planeación patrimonial", "Protección para tu familia"] },
  { icon: Home, t: "Bienes", d: "Tu casa, tu negocio y tus bienes cubiertos contra lo inesperado.", items: ["Hogar", "Negocio", "Mascotas"] },
];
const INTERESES = ["Seguro de vida", "Gastos médicos mayores", "Seguro de auto", "Retiro / PPR", "Pensión IMSS", "Modalidad 10", "INFONAVIT", "Patrimonio y bienes", "Otro"];
const PASOS = [
  { n: "1", t: "Platicamos", d: "Me cuentas tu situación y lo que quieres proteger o lograr. Sin compromiso." },
  { n: "2", t: "Diseñamos tu plan", d: "Comparo opciones de varias aseguradoras y te recomiendo solo lo que te conviene." },
  { n: "3", t: "Te acompaño siempre", d: "Contratación, pagos, renovaciones y siniestros: no estás solo en ningún paso." },
];

export default function Landing() {
  const [f, setF] = useState({ nombre: "", telefono: "", correo: "", interes: "", mensaje: "" });
  const [estado, setEstado] = useState("idle"); // idle | enviando | ok | error

  useEffect(() => {
    document.title = "J L Consultoría Patrimonial · Protege tu presente. Construye tu futuro.";
    registrarEvento("visita", "inicio");
  }, []);

  async function enviar(e) {
    e.preventDefault();
    if (!f.telefono.trim() && !f.correo.trim()) { setEstado("falta"); return; }
    setEstado("enviando");
    const { error } = await supabase.from("solicitudes_web").insert({
      nombre: f.nombre.trim(),
      telefono: f.telefono.trim() || null,
      correo: f.correo.trim() || null,
      interes: f.interes || null,
      mensaje: f.mensaje.trim() || null,
    });
    setEstado(error ? "error" : "ok");
  }
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const inp = { width: "100%", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 15, background: "#fff", color: "var(--ink)", fontFamily: "inherit" };
  const lbl = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 600 };

  return (
    <div style={{ background: "var(--cream)", color: "var(--ink)", fontFamily: "'Manrope', system-ui, sans-serif", minHeight: "100dvh" }}>
      <style>{`
        .lp-wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
        .lp-hero { display: grid; grid-template-columns: 1fr; gap: 36px; align-items: center; }
        .lp-areas { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 16px; }
        .lp-pasos { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
        .lp-contacto { display: grid; grid-template-columns: 1fr 1.1fr; gap: 28px; align-items: start; }
        .lp-nav-links { display: flex; gap: 22px; }
        .lp-card { transition: transform .25s cubic-bezier(.2,.7,.2,1), box-shadow .25s; }
        .lp-card:hover { transform: translateY(-3px); }
        @media (max-width: 820px) {
          .lp-hero, .lp-contacto { grid-template-columns: 1fr; }
          .lp-nav-links { display: none; }
        }
      `}</style>

      {/* Barra superior */}
      <header style={{ background: "var(--cream)", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 20 }}>
        <div className="lp-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 70 }}>
          <img src={JL_LOGO} alt="J L Consultoría Patrimonial" style={{ height: 60, objectFit: "contain" }} />
          <nav className="lp-nav-links" style={{ fontSize: 14, fontWeight: 600 }}>
            <a href="#servicios" style={{ color: "var(--ink)", textDecoration: "none" }}>Servicios</a>
            <a href="/diagnostico" style={{ color: "var(--gold-text)", textDecoration: "none" }}>Diagnóstico gratis</a>
            <a href="#asesoria" style={{ color: "var(--ink)", textDecoration: "none" }}>Cómo trabajo</a>
            <a href="#contacto" style={{ color: "var(--ink)", textDecoration: "none" }}>Contacto</a>
          </nav>
          <a href="/portal" style={{ background: "var(--ink)", color: "#fff", padding: "9px 16px", borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>Acceso clientes</a>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: "radial-gradient(120% 120% at 15% 10%, var(--ink-2), var(--ink) 60%)", color: "#fff" }}>
        <div className="lp-wrap lp-hero" style={{ padding: "56px 20px 36px" }}>
          <div className="stagger">
            <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700 }}>Asesoría en protección y patrimonio</div>
            <h1 className="serif" style={{ fontSize: "clamp(34px, 6vw, 54px)", lineHeight: 1.08, margin: "14px 0 16px", fontWeight: 500 }}>
              Protege tu presente.<br /><span style={{ color: "var(--gold)" }}>Construye tu futuro.</span>
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: "#D6DEE5", maxWidth: 480 }}>
              Soy Joshua Lechuga, asesor en protección y planeación patrimonial. Te ayudo a elegir lo que de verdad te conviene, sin presiones: <b style={{ color: "#fff" }}>si no te conviene, no te lo vendo.</b>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
              <a href="/diagnostico" style={{ background: "var(--gold)", color: "#fff", padding: "13px 22px", borderRadius: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>Hacer mi diagnóstico gratis <ArrowRight size={16} /></a>
              <a href={wa("Hola Joshua, vi tu página y me gustaría una asesoría.")} target="_blank" rel="noreferrer" style={{ border: "1px solid rgba(255,255,255,.35)", color: "#fff", padding: "13px 20px", borderRadius: 12, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}><MessageCircle size={16} /> WhatsApp</a>
            </div>
          </div>
        </div>
        <div className="lp-wrap" style={{ paddingBottom: 48 }}>
          <div style={{ borderRadius: 22, overflow: "hidden", boxShadow: "0 30px 60px -30px rgba(0,0,0,.7)", border: "1px solid rgba(255,255,255,.12)" }}>
            <img src="/fondos/banner-jl.jpg" alt="J L Consultoría Patrimonial" style={{ display: "block", width: "100%", height: "auto" }} />
          </div>
        </div>
      </section>

      {/* Diagnóstico patrimonial */}
      <section className="lp-wrap" style={{ padding: "40px 20px 0" }}>
        <div style={{ background: "var(--gold-soft)", border: "1px solid #E7D49A", borderRadius: 22, padding: "26px 24px", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--gold)", display: "grid", placeItems: "center" }}><ClipboardCheck size={22} color="#fff" /></span>
            <span style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold-text)", fontWeight: 800 }}>Gratis · menos de 3 minutos</span>
          </div>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.15 }}>Descubre qué tan protegidos están tu patrimonio y tu familia</h2>
          <p style={{ color: "var(--muted)", maxWidth: 620, lineHeight: 1.55 }}>Responde unas preguntas y recibe al instante tu puntaje, un mapa de tus áreas más débiles y los primeros pasos para fortalecerlas.</p>
          <div><a href="/diagnostico" style={{ background: "var(--ink)", color: "#fff", padding: "13px 22px", borderRadius: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>Hacer mi diagnóstico <ArrowRight size={16} /></a></div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="lp-wrap" style={{ padding: "64px 20px 24px" }}>
        <h2 className="serif" style={{ fontSize: 32, fontWeight: 500 }}>Todo lo que necesitas, en un solo lugar</h2>
        <p style={{ color: "var(--muted)", margin: "8px 0 28px", maxWidth: 560 }}>Desde proteger a tu familia hasta planear tu retiro y cuidar tu patrimonio.</p>
        <div className="lp-areas">
          {AREAS.map((a) => {
            const I = a.icon;
            return (
              <article key={a.t} className="panel lp-card" style={{ padding: 22 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--gold-soft)", display: "grid", placeItems: "center", marginBottom: 14 }}><I size={22} color="var(--gold-text)" /></div>
                <h3 className="serif" style={{ fontSize: 21 }}>{a.t}</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", margin: "6px 0 12px", lineHeight: 1.5 }}>{a.d}</p>
                <ul style={{ listStyle: "none", fontSize: 13, display: "grid", gap: 6 }}>
                  {a.items.map((i) => <li key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}><Check size={14} color="var(--emerald)" /> {i}</li>)}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      {/* Cómo trabajo */}
      <section id="asesoria" className="lp-wrap" style={{ padding: "56px 20px 24px" }}>
        <h2 className="serif" style={{ fontSize: 32, fontWeight: 500 }}>Así comienza tu asesoría</h2>
        <div className="lp-pasos" style={{ marginTop: 24 }}>
          {PASOS.map((p) => (
            <div key={p.n} className="panel" style={{ padding: 20 }}>
              <div className="serif" style={{ fontSize: 38, color: "var(--gold)", lineHeight: 1 }}>{p.n}</div>
              <h3 style={{ fontSize: 17, margin: "8px 0 4px" }}>{p.t}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portal de clientes */}
      <section className="lp-wrap" style={{ padding: "48px 20px 24px" }}>
        <div style={{ background: "var(--ink)", color: "#fff", borderRadius: 22, padding: "32px 26px", display: "grid", gap: 18 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700 }}>Para mis clientes</div>
            <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: "8px 0" }}>Tu portal: tus pólizas, siempre en tu bolsillo</h2>
            <p style={{ color: "#D6DEE5", maxWidth: 620, lineHeight: 1.55 }}>Entra con tu correo y tu contraseña, y si quieres con Face ID o huella. Consulta tus pólizas, recibe recordatorios de pago, reporta un siniestro o pide asesoría. Instálalo en tu celular como una app.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 14, color: "#fff" }}>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}><FileText size={16} color="var(--gold)" /> Tus pólizas en PDF</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Bell size={16} color="var(--gold)" /> Calendario de pagos</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Smartphone size={16} color="var(--gold)" /> Instalable en iPhone y Android</span>
          </div>
          <div><a href="/portal" style={{ background: "var(--gold)", color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>Entrar a mi portal <ArrowRight size={16} /></a></div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="lp-wrap" style={{ padding: "56px 20px 64px" }}>
        <div className="lp-contacto">
          <div>
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 500 }}>Hablemos</h2>
            <p style={{ color: "var(--muted)", margin: "8px 0 20px", lineHeight: 1.55 }}>Cuéntame qué necesitas y te respondo personalmente. La primera asesoría no tiene costo ni compromiso.</p>
            <div style={{ display: "grid", gap: 12, fontSize: 15 }}>
              <a href={wa("Hola Joshua, me gustaría una asesoría.")} target="_blank" rel="noreferrer" style={{ color: "var(--ink)", textDecoration: "none", display: "flex", gap: 10, alignItems: "center" }}><MessageCircle size={18} color="var(--gold-text)" /> WhatsApp {WHATSAPP_VISIBLE}</a>
              <a href={`mailto:${CORREO}`} style={{ color: "var(--ink)", textDecoration: "none", display: "flex", gap: 10, alignItems: "center" }}><Mail size={18} color="var(--gold-text)" /> {CORREO}</a>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 22 }}><b style={{ color: "var(--ink)" }}>Joshua Lechuga Plata</b><br />Asesor en protección y planeación patrimonial</p>
          </div>

          <div className="panel" style={{ padding: 22 }}>
            {estado === "ok" ? (
              <div>
                <h3 className="serif" style={{ fontSize: 22 }}>¡Gracias, {f.nombre.split(" ")[0]}!</h3>
                <p style={{ color: "var(--muted)", margin: "8px 0 16px", lineHeight: 1.5 }}>Recibí tu solicitud y te contactaré muy pronto. Si prefieres una respuesta inmediata, escríbeme por WhatsApp.</p>
                <a href={wa(`Hola Joshua, soy ${f.nombre}. Acabo de dejar mis datos en tu página${f.interes ? ` (me interesa: ${f.interes})` : ""}.`)} target="_blank" rel="noreferrer" style={{ background: "var(--gold)", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}><MessageCircle size={16} /> Escribirme por WhatsApp</a>
              </div>
            ) : (
              <form onSubmit={enviar} style={{ display: "grid", gap: 12 }}>
                <div><label style={lbl}>Nombre</label><input required minLength={2} maxLength={120} value={f.nombre} onChange={set("nombre")} autoComplete="name" style={inp} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lbl}>Teléfono / WhatsApp</label><input type="tel" inputMode="tel" maxLength={30} value={f.telefono} onChange={set("telefono")} autoComplete="tel" style={inp} /></div>
                  <div><label style={lbl}>Correo</label><input type="email" maxLength={160} value={f.correo} onChange={set("correo")} autoComplete="email" style={inp} /></div>
                </div>
                <div><label style={lbl}>¿Qué te interesa?</label>
                  <select value={f.interes} onChange={set("interes")} style={inp}><option value="">Elige un tema</option>{INTERESES.map((i) => <option key={i}>{i}</option>)}</select>
                </div>
                <div><label style={lbl}>Mensaje (opcional)</label><textarea rows={3} maxLength={1000} value={f.mensaje} onChange={set("mensaje")} style={inp} /></div>
                <button type="submit" disabled={estado === "enviando"} style={{ background: "var(--ink)", color: "#fff", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: estado === "enviando" ? 0.6 : 1 }}>{estado === "enviando" ? "Enviando…" : "Solicitar asesoría"}</button>
                {estado === "falta" && <p style={{ fontSize: 12, color: "#B23A2E" }}>Déjame un teléfono o un correo para poder contactarte.</p>}
                {estado === "error" && <p style={{ fontSize: 12, color: "#B23A2E" }}>No pude enviar tu solicitud. Intenta de nuevo o escríbeme por WhatsApp.</p>}
                <p style={{ fontSize: 11, color: "var(--muted)" }}>Tus datos se usan únicamente para contactarte sobre tu solicitud.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "22px 20px", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
        © 2026 J L Consultoría Patrimonial
      </footer>
    </div>
  );
}
