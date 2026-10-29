import React from "react";
import { colorPuntaje } from "./motor.js";

// Gráficas del Diagnóstico Patrimonial. SVG con atributos explícitos para que se vean igual en pantalla y en el PDF.

export function Medidor({ valor, color, estatico = false }) {
  const R = 74, C = 2 * Math.PI * R;
  const lleno = (C * Math.max(0, Math.min(100, valor))) / 100;
  return (
    <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label={`Puntaje ${valor} de 100`} style={{ display: "block", maxWidth: "100%" }}>
      <circle cx="100" cy="100" r={R} fill="none" stroke="#E6EAE9" strokeWidth="16" />
      <circle
        cx="100" cy="100" r={R} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
        strokeDasharray={`${lleno} ${C}`} transform="rotate(-90 100 100)"
        className={estatico ? "" : "dl-arco"} style={estatico ? undefined : { "--lleno": lleno, "--total": C }}
      />
      <text x="100" y="104" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="54" fontWeight="600" fill="#0B2A44">{valor}</text>
      <text x="100" y="128" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="600" fill="#5C6B78">de 100</text>
    </svg>
  );
}

export function Radar({ areas, color }) {
  const cx = 130, cy = 120, R = 78;
  const ang = [-90, 0, 90, 180].map((d) => (d * Math.PI) / 180); // arriba, derecha, abajo, izquierda
  const pt = (i, f) => [cx + Math.cos(ang[i]) * R * f, cy + Math.sin(ang[i]) * R * f];
  const poli = (f) => areas.map((_, i) => pt(i, f).join(",")).join(" ");
  const datos = areas.map((a, i) => pt(i, Math.max(0.04, a.puntaje / 100)).join(",")).join(" ");
  const lab = [
    [cx, 20, "middle"], [cx + R + 12, cy + 4, "start"], [cx, cy + R + 28, "middle"], [cx - R - 12, cy + 4, "end"],
  ];
  return (
    <svg viewBox="0 0 260 240" width="260" height="240" role="img" aria-label="Mapa de tu protección por área" style={{ display: "block", maxWidth: "100%" }}>
      {[1, 0.75, 0.5, 0.25].map((f) => <polygon key={f} points={poli(f)} fill="none" stroke="#DCE2E1" strokeWidth="1" />)}
      {areas.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#DCE2E1" strokeWidth="1" />; })}
      <polygon points={datos} fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2.5" strokeLinejoin="round" className="dl-radar" />
      {areas.map((a, i) => { const [x, y] = pt(i, Math.max(0.04, a.puntaje / 100)); return <circle key={a.id} cx={x} cy={y} r="4.5" fill={colorPuntaje(a.puntaje)} stroke="#fff" strokeWidth="2" />; })}
      {areas.map((a, i) => (
        <text key={a.id} x={lab[i][0]} y={lab[i][1]} textAnchor={lab[i][2]} fontFamily="Manrope, sans-serif" fontSize="12" fontWeight="700" fill="#0B2A44">
          {a.corto}
          <tspan x={lab[i][0]} dy="14" fontWeight="600" fill="#5C6B78">{a.puntaje}</tspan>
        </text>
      ))}
    </svg>
  );
}

export function BarrasAreas({ areas, estatico = false }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {areas.map((a) => {
        const c = colorPuntaje(a.puntaje);
        return (
          <div key={a.id}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              <span>{a.nombre}</span><span style={{ color: c }}>{a.puntaje}/100</span>
            </div>
            <div style={{ height: 12, borderRadius: 99, background: "#E6EAE9", overflow: "hidden" }}>
              <div className={estatico ? "" : "dl-barra"} style={{ width: `${Math.max(3, a.puntaje)}%`, height: "100%", background: c, borderRadius: 99 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const fmtMeses = (m) => (m >= 24 ? `${Math.round((m / 12) * 10) / 10} años` : m < 1 ? "menos de 1 mes" : `${Math.round(m * 10) / 10} meses`.replace(".0", ""));

export function Colchon({ meses, mesesRef, dep, estatico = false }) {
  const max = 36;
  const w1 = Math.max(4, Math.min(100, (meses / max) * 100));
  const w2 = Math.min(100, (mesesRef / max) * 100);
  const c = meses >= 18 ? "#1E5C4C" : meses >= 6 ? "#C9971E" : "#B23A2E";
  return (
    <div>
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
            <span>{dep ? "Lo que tu familia podría sostener hoy" : "Lo que podrías sostenerte hoy"}</span><span style={{ color: c }}>{fmtMeses(meses)}</span>
          </div>
          <div style={{ height: 16, borderRadius: 99, background: "#E6EAE9", overflow: "hidden" }}>
            <div className={estatico ? "" : "dl-barra"} style={{ width: `${w1}%`, height: "100%", background: c, borderRadius: 99 }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
            <span>{dep ? "Lo que suele tardar una familia en recuperarse" : "Tiempo razonable para reacomodarte"}</span><span style={{ color: "#0B2A44" }}>2 a 3 años</span>
          </div>
          <div style={{ height: 16, borderRadius: 99, background: "#E6EAE9", overflow: "hidden" }}>
            <div className={estatico ? "" : "dl-barra"} style={{ width: `${w2}%`, height: "100%", background: "#0B2A44", borderRadius: 99 }} />
          </div>
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: "#5C6B78", marginTop: 10 }}>Estimación orientativa según tus respuestas. Referencia de recuperación: AXA México, folleto Vida ProTGT 2023.</p>
    </div>
  );
}
