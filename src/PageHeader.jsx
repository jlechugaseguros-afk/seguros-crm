import React from "react";
import { InsurerMark } from "./insurerLogos.jsx";

// Encabezado de cada pestaña: foto de oficinas de aseguradoras bajo capa azul marino, con una variación por pestaña
// (foto distinta, encuadre distinto y, en las pestañas de aseguradoras, una fila con sus logos).
const FOTOS = {
  banorte: "/fondos/banorte.jpg",
  gmx: "/fondos/gmx.jpg",
  aguila: "/fondos/aguila.jpg",
  zurich: "/fondos/zurich.jpg",
  mapfre: "/fondos/mapfre.jpg",
  qualitas: "/fondos/qualitas.jpg",
  gnp: "/fondos/gnp.jpg",
  axa: "/fondos/axa.jpg",
};

const LOGOS_COTIZADOR = ["GNP", "AXA", "Qualitas", "ANA", "Zurich", "Mapfre"];
const LOGOS_CONDICIONES = ["HDI", "Chubb", "Allianz", "MetLife", "Banorte", "Plan Seguro"];

const VARIANTES = {
  "Planificador":           { foto: "gmx", pos: "center 28%", dir: "90deg" },
  "Recordatorios":          { foto: "gnp", pos: "center 28%", dir: "100deg" },
  "Clientes":               { foto: "zurich", pos: "center 34%", dir: "90deg" },
  "Prospectos":             { foto: "aguila", pos: "center 38%", dir: "110deg" },
  "Condiciones generales":  { foto: "mapfre", pos: "center 52%", dir: "95deg", logos: LOGOS_CONDICIONES },
  "Tarjeta digital":        { foto: "axa", pos: "center 40%", dir: "100deg" },
  "Comisiones":             { foto: "banorte", pos: "center 22%", dir: "110deg" },
  "Multicotizador":         { foto: "qualitas", pos: "center 30%", dir: "95deg", logos: LOGOS_COTIZADOR },
  "Calculadora de factura": { foto: "gmx", pos: "center 62%", dir: "100deg" },
};
const POR_DEFECTO = { foto: "gmx", pos: "center 36%", dir: "100deg" };

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
