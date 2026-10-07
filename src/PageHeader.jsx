import React from "react";
import { InsurerMark } from "./insurerLogos.jsx";

// Encabezado de cada pestaña: foto de MC Brokers bajo capa azul marino, con una variación por pestaña
// (foto distinta, encuadre distinto y, en las pestañas de aseguradoras, una fila con sus logos).
const FOTOS = {
  lobby: "/fondos/lobby.jpg",
  fachada: "/fondos/fachada.jpg",
  recepcion: "/fondos/recepcion.jpg",
};

const LOGOS_COTIZADOR = ["GNP", "AXA", "Qualitas", "ANA", "Zurich", "Mapfre"];
const LOGOS_CONDICIONES = ["HDI", "Chubb", "Allianz", "MetLife", "Banorte", "Plan Seguro"];

const VARIANTES = {
  "Planificador":           { foto: "recepcion", pos: "center 30%", dir: "90deg" },
  "Recordatorios":          { foto: "lobby", pos: "center 62%", dir: "100deg" },
  "Clientes":               { foto: "fachada", pos: "center 40%", dir: "90deg" },
  "Prospectos":             { foto: "lobby", pos: "center 35%", dir: "110deg" },
  "Condiciones generales":  { foto: "recepcion", pos: "center 62%", dir: "95deg", logos: LOGOS_CONDICIONES },
  "Tarjeta digital":        { foto: "fachada", pos: "center 28%", dir: "100deg" },
  "Comisiones":             { foto: "fachada", pos: "center 72%", dir: "110deg" },
  "Multicotizador":         { foto: "lobby", pos: "center 50%", dir: "95deg", logos: LOGOS_COTIZADOR },
  "Calculadora de factura": { foto: "recepcion", pos: "center 52%", dir: "100deg" },
};
const POR_DEFECTO = { foto: "lobby", pos: "center 55%", dir: "100deg" };

export default function PageHeader({ eyebrow, title, subtitle, action }) {
  const v = VARIANTES[title] || POR_DEFECTO;
  return (
    <div
      className="page-hero"
      style={{ "--hero-img": `url("${FOTOS[v.foto]}")`, "--hero-pos": v.pos, "--hero-dir": v.dir }}
    >
      <div style={{ minWidth: 0, position: "relative" }}>
        <div className="eyebrow" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E6BC55" }}>{eyebrow}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 30, color: "#fff", margin: "4px 0 2px" }}>{title}</h2>
        {subtitle && <div style={{ fontSize: 13.5, color: "#DCE6EE" }}>{subtitle}</div>}
      </div>
      {v.logos && (
        <div className="hero-logos" aria-hidden="true">
          {v.logos.map((n) => <InsurerMark key={n} name={n} w={62} h={34} radius={9} />)}
        </div>
      )}
      {action && <div style={{ position: "relative" }}>{action}</div>}
    </div>
  );
}
