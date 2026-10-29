import React, { useEffect, useMemo, useState } from "react";
import { Copy, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "./supabaseClient.js";

// Contenido del panel "Landing page" del Dashboard: visitas mes con mes, diagnósticos y enlaces para redes.
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const REDES = [
  ["Instagram", "instagram"], ["Facebook", "facebook"], ["WhatsApp", "whatsapp"], ["TikTok", "tiktok"], ["LinkedIn", "linkedin"],
];

// Últimos n meses (clave AAAA-MM), del más antiguo al actual, en hora de México.
function ultimosMeses(n) {
  const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    out.push({ clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, etiqueta: MESES[d.getMonth()] });
  }
  return out;
}

function Variacion({ actual, previo }) {
  if (!previo && !actual) return <span style={{ color: "var(--stone)", fontSize: 11.5 }}>Sin datos aún</span>;
  if (!previo) return <span style={{ color: "var(--emerald)", fontSize: 11.5, fontWeight: 700 }}>Nuevo este mes</span>;
  const d = Math.round(((actual - previo) / previo) * 100);
  const I = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  const c = d > 0 ? "var(--emerald)" : d < 0 ? "#B23A2E" : "var(--stone)";
  return <span style={{ color: c, fontSize: 11.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}><I size={12} /> {d > 0 ? "+" : ""}{d} % vs mes anterior</span>;
}

export default function LandingMetricas() {
  const [filas, setFilas] = useState(null);
  const [err, setErr] = useState(false);
  const [copiado, setCopiado] = useState("");
  const meses = useMemo(() => ultimosMeses(6), []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.rpc("resumen_landing", { p_meses: 6 });
      if (!vivo) return;
      if (error) { setErr(true); return; }
      setFilas(data || []);
    })();
    return () => { vivo = false; };
  }, []);

  const serie = useMemo(() => meses.map((m) => {
    const f = (filas || []).find((x) => x.mes === m.clave);
    return { ...m, visitas: Number(f?.visitas || 0), unicos: Number(f?.unicos || 0), inicios: Number(f?.inicios || 0), terminados: Number(f?.terminados || 0) };
  }), [filas, meses]);

  const act = serie[serie.length - 1];
  const prev = serie[serie.length - 2];
  const max = Math.max(1, ...serie.map((s) => s.visitas));
  const conv = act.unicos ? Math.round((act.terminados / act.unicos) * 100) : 0;
  const base = `${window.location.origin}/diagnostico`;

  async function copiar(clave, url) {
    try { await navigator.clipboard.writeText(url); } catch {
      const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopiado(clave); setTimeout(() => setCopiado(""), 1800);
  }

  if (err) return <p style={{ color: "var(--stone)", fontSize: 13 }}>No se pudieron cargar las visitas. Intenta de nuevo más tarde.</p>;
  if (!filas) return <p style={{ color: "var(--stone)", fontSize: 13 }}>Cargando visitas…</p>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
        {[
          ["Visitas del mes", act.visitas, prev.visitas],
          ["Visitantes únicos", act.unicos, prev.unicos],
          ["Diagnósticos iniciados", act.inicios, prev.inicios],
          ["Diagnósticos completados", act.terminados, prev.terminados],
        ].map(([t, v, p]) => (
          <div key={t} style={{ background: "var(--cream)", borderRadius: 12, padding: "10px 12px" }}>
            <div className="serif" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>{v}</div>
            <div style={{ fontSize: 12, color: "var(--stone)", margin: "2px 0 3px" }}>{t}</div>
            <Variacion actual={v} previo={p} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>
        Conversión del mes: <b style={{ color: "var(--ink)" }}>{conv} %</b> de los visitantes terminó el diagnóstico y dejó sus datos.
      </div>

      <div style={{ marginTop: 14, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--stone)", fontWeight: 700 }}>Visitas por mes</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${serie.length}, minmax(0,1fr))`, gap: 8, alignItems: "end", height: 110, marginTop: 8 }}>
        {serie.map((s, i) => (
          <div key={s.clave} style={{ display: "grid", gap: 4, justifyItems: "center", alignContent: "end", height: "100%" }}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{s.visitas}</span>
            <i className="grow-y" style={{ width: "100%", maxWidth: 34, height: `${Math.max(4, (s.visitas / max) * 70)}px`, borderRadius: 8, background: i === serie.length - 1 ? "var(--gold)" : "var(--ink)", opacity: i === serie.length - 1 ? 1 : 0.75, transformOrigin: "bottom" }} />
            <span style={{ fontSize: 11, color: "var(--stone)" }}>{s.etiqueta}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--stone)", fontWeight: 700 }}>Enlace del diagnóstico para tus redes</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <button onClick={() => copiar("base", base)} className="link-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
          {copiado === "base" ? <Check size={14} /> : <Copy size={14} />} Enlace general
        </button>
        {REDES.map(([n, c]) => (
          <button key={c} onClick={() => copiar(c, `${base}?f=${c}`)} className="link-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {copiado === c ? <Check size={14} /> : <Copy size={14} />} {n}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: "var(--stone)", marginTop: 8, lineHeight: 1.5 }}>Cada enlace marca de qué red llegó el prospecto; lo verás en sus notas. Tus propias visitas con sesión abierta no se cuentan.</p>
    </div>
  );
}
