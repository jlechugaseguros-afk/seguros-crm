import React from "react";
import { InsurerMark } from "./insurerLogos.jsx";

// Encabezado de cada pestaña: la imagen de marca de J L Consultoría Patrimonial (logo en muro azul marino).
// En pantallas anchas el título se apoya sobre la pared lisa de la imagen; en celular y tablet va en una
// franja debajo. Un único momento animado: un destello dorado cruza el logo al abrir la pestaña.
const LOGOS_COTIZADOR = ["GNP", "AXA", "Qualitas", "ANA", "Zurich", "Mapfre"];
const LOGOS_CONDICIONES = ["HDI", "Chubb", "Allianz", "MetLife", "Banorte", "Plan Seguro"];

const LOGOS = {
  "Condiciones generales": LOGOS_CONDICIONES,
  "Multicotizador": LOGOS_COTIZADOR,
};

export default function PageHeader({ eyebrow, title, subtitle, action }) {
  const logos = LOGOS[title];
  return (
    <header className="jl-hero">
      <div className="jl-hero-img" role="img" aria-label="J L Consultoría Patrimonial" />
      <div className="jl-hero-sheen" aria-hidden="true" />
      <div className="jl-hero-bar">
        <div className="jl-hero-text">
          {eyebrow && <div className="jl-hero-eyebrow">{eyebrow}</div>}
          <h2 className="jl-hero-title">{title}</h2>
          {subtitle && <p className="jl-hero-sub">{subtitle}</p>}
        </div>
        {(logos || action) && (
          <div className="jl-hero-aside">
            {logos && (
              <div className="hero-logos" aria-hidden="true">
                {logos.map((n) => <InsurerMark key={n} name={n} w={48} h={28} radius={8} />)}
              </div>
            )}
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
