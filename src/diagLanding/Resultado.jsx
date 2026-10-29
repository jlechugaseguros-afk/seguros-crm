import React from "react";
import { Medidor, Radar, BarrasAreas, Colchon } from "./Graficas.jsx";
import { colorPuntaje } from "./motor.js";
import { JL_LOGO } from "../brandAssets.js";
import { WHATSAPP_VISIBLE, CORREO } from "./contacto.js";

const tarjeta = { background: "#fff", border: "1px solid #E0E5E4", borderRadius: 18, padding: 22 };
const titulo = { fontFamily: "Fraunces, Georgia, serif", fontSize: 21, fontWeight: 500, color: "#0B2A44", margin: "0 0 4px" };
const sub = { fontSize: 13.5, color: "#4F5E6B", margin: "0 0 16px", lineHeight: 1.5 };

function frase(res) {
  if (res.total >= 80) return `Tienes una base sólida. Hay detalles por afinar para llegar con firmeza a ${res.metaTxt}.`;
  if (res.total >= 60) return `Vas por buen camino, pero hay huecos que conviene cerrar antes de que te cuesten caro.`;
  if (res.total >= 35) return `Tienes algo de protección, pero hoy un imprevisto grave sí movería tus finanzas y las de tu familia.`;
  return `Hoy estás muy expuesto a un imprevisto. La buena noticia: identificarlo es el primer paso y tiene solución.`;
}

export function Encabezado({ res, nombre, estatico }) {
  const primer = String(nombre || "").trim().split(" ")[0];
  return (
    <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
      <div style={{ background: "radial-gradient(120% 140% at 0% 0%, #123B5C 0%, #0B2A44 55%, #071D31 100%)", color: "#fff", padding: "22px 22px 18px" }}>
        <div style={{ fontSize: 11.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#E0B44A", fontWeight: 700 }}>Tu diagnóstico patrimonial</div>
        <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 28, fontWeight: 500, margin: "6px 0 0", lineHeight: 1.15 }}>
          {primer ? `${primer}, este es tu punto de partida` : "Este es tu punto de partida"}
        </h2>
      </div>
      <div className="dl-hero">
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Medidor valor={res.total} color={res.color} estatico={estatico} /></div>
          <div style={{ display: "inline-block", marginTop: 4, padding: "6px 14px", borderRadius: 99, background: res.color, color: "#fff", fontWeight: 700, fontSize: 13 }}>{res.nivel}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}><Radar areas={res.areas} color={res.color} /></div>
      </div>
      <p style={{ margin: 0, padding: "0 22px 22px", fontSize: 15.5, lineHeight: 1.55, color: "#0B2A44", textAlign: "center" }}>{frase(res)}</p>
    </div>
  );
}

export function SeccionAreas({ res, estatico }) {
  return (
    <div style={tarjeta}>
      <h3 style={titulo}>Cómo está cada área</h3>
      <p style={sub}>Verde: bien cubierta · Dorado: mejorable · Rojo: urgente.</p>
      <BarrasAreas areas={res.areas} estatico={estatico} />
    </div>
  );
}

export function SeccionColchon({ res, estatico }) {
  return (
    <div style={tarjeta}>
      <h3 style={titulo}>{res.dep ? "Si hoy faltaras, ¿cuánto aguantaría tu familia?" : "Si hoy no pudieras trabajar, ¿cuánto aguantarías?"}</h3>
      <p style={sub}>Cruzamos tu fondo de emergencia con tu seguro de vida para estimar tu colchón real.</p>
      <Colchon meses={res.meses} mesesRef={res.mesesRef} dep={res.dep} estatico={estatico} />
    </div>
  );
}

export function SeccionBrechas({ res }) {
  return (
    <div style={tarjeta}>
      <h3 style={titulo}>{res.brechas.length ? "Tus prioridades, en orden" : "Lo que sigue para ti"}</h3>
      <p style={sub}>{res.brechas.length ? `Lo más urgente para avanzar hacia ${res.metaTxt}.` : `Tu base es sólida. Revisemos cómo optimizarla para ${res.metaTxt}.`}</p>
      <div style={{ display: "grid", gap: 12 }}>
        {res.brechas.map((b, i) => (
          <div key={b.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, padding: 16, borderRadius: 14, background: "#F6F8F7", border: "1px solid #E0E5E4" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: colorPuntaje(b.puntaje), color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 16 }}>{i + 1}</div>
            <div>
              <div style={{ fontWeight: 800, color: "#0B2A44", fontSize: 15.5 }}>{b.titulo}</div>
              <p style={{ margin: "4px 0 8px", fontSize: 13.5, lineHeight: 1.5, color: "#4F5E6B" }}>{b.mensaje}</p>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#A87A12" }}>Siguiente paso: {b.paso}</div>
            </div>
          </div>
        ))}
        {!res.brechas.length && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#4F5E6B" }}>Con una revisión de coberturas y sumas aseguradas puedes asegurarte de que tu protección crezca al ritmo de tu vida.</p>}
      </div>
    </div>
  );
}

// Hojas del PDF (tamaño carta, 816 px de ancho). Se generan con renderToStaticMarkup.
export function HojasPdf({ res, nombre }) {
  const fecha = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const hoja = { width: 816, minHeight: 1056, boxSizing: "border-box", padding: "36px 40px", background: "#F1F3F2", display: "flex", flexDirection: "column", gap: 18, fontFamily: "Manrope, sans-serif", color: "#0B2A44" };
  const cab = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <img src={JL_LOGO} alt="J L Consultoría Patrimonial" style={{ height: 56 }} />
      <div style={{ textAlign: "right", fontSize: 12, color: "#4F5E6B" }}>Diagnóstico patrimonial<br />{fecha}</div>
    </div>
  );
  return (
    <div className="sheets">
      <div className="sheet" style={hoja}>
        {cab}
        <Encabezado res={res} nombre={nombre} estatico />
        <SeccionAreas res={res} estatico />
      </div>
      <div className="sheet" style={hoja}>
        {cab}
        <SeccionColchon res={res} estatico />
        <SeccionBrechas res={res} />
        <div style={{ ...tarjeta, background: "#0B2A44", color: "#fff", border: "none" }}>
          <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22 }}>Platiquemos tu plan, sin compromiso</div>
          <p style={{ margin: "6px 0 10px", fontSize: 14, lineHeight: 1.5, color: "#D6DEE5" }}>Con estos resultados diseño contigo un plan a tu medida y comparo opciones de varias aseguradoras. Si algo no te conviene, no te lo vendo.</p>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Joshua Lechuga Plata · Asesor en protección y planeación patrimonial</div>
          <div style={{ fontSize: 13.5, color: "#E0B44A", marginTop: 4 }}>WhatsApp {WHATSAPP_VISIBLE} · {CORREO}</div>
        </div>
        <p style={{ margin: "auto 0 0", fontSize: 10.5, color: "#5C6B78", lineHeight: 1.5 }}>Este diagnóstico es una orientación general basada en tus respuestas. No es una cotización ni constituye una oferta de seguro; las coberturas, primas y condiciones dependen de cada aseguradora y de tu perfil.</p>
      </div>
    </div>
  );
}
