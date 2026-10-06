import React from "react";
import { INSURER_LOGOS } from "./insurerLogoAssets.js";

// Devuelve la clave del logo según el nombre de la aseguradora ("GNP Seguros" -> "gnp"), o "" si no hay logo.
export function insurerKey(name) {
  const n = String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!n) return "";
  if (/\bgnp\b/.test(n)) return "gnp";
  if (/\baxa\b/.test(n)) return "axa";
  if (/qualitas/.test(n)) return "qualitas";
  if (/\bana\b/.test(n)) return "ana";
  if (/plan seguro/.test(n)) return "planseguro";
  if (/\bgmx\b/.test(n)) return "gmx";
  if (/mapfre/.test(n)) return "mapfre";
  if (/zurich/.test(n)) return "zurich";
  if (/clupp/.test(n)) return "clupp";
  if (/crabi/.test(n)) return "crabi";
  if (/aguila/.test(n)) return "aguila";
  if (/click/.test(n)) return "click";
  if (/\bhdi\b/.test(n)) return "hdi";
  if (/metlife/.test(n)) return "metlife";
  if (/banorte/.test(n)) return "banorte";
  if (/chubb/.test(n)) return "chubb";
  if (/allianz/.test(n)) return "allianz";
  return "";
}

export function insurerLogo(name) {
  return INSURER_LOGOS[insurerKey(name)] || null;
}

// Logo de la aseguradora. La caja se adapta a la forma del logo (los altos, como Qualitas, salen más grandes);
// si no hay logo, muestra la letra de siempre.
export function InsurerMark({ name, w = 56, h = 34, radius = 8, color = "var(--stone)", fontSize = 14, fallback }) {
  const logo = insurerLogo(name);
  if (!logo) {
    return (
      <div style={{
        width: h, height: h, borderRadius: radius, flexShrink: 0, background: color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize,
      }}>
        {fallback !== undefined ? fallback : (name ? String(name).charAt(0).toUpperCase() : "?")}
      </div>
    );
  }
  const aspect = logo.w / logo.h;
  const pad = logo.bg ? 0 : 3;
  const boxH = aspect < 0.85 ? Math.round(h * 1.2) : h;
  const boxW = Math.max(boxH, Math.min(w, Math.round((boxH - 2 * pad) * aspect + 2 * pad)));
  return (
    <div style={{ width: w, height: boxH, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: boxW, height: boxH, borderRadius: radius, boxSizing: "border-box",
        background: logo.bg || "#FFFFFF", border: logo.bg ? "none" : "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: pad,
      }}>
        <img src={logo.src} alt={`Logo ${name}`} draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </div>
    </div>
  );
}
