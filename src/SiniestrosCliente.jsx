import React, { useState } from "react";
import { Plus, Trash2, Phone, MessageCircle } from "lucide-react";
import { InsurerMark } from "./insurerLogos.jsx";
import { fmtMonto, fmtDateFull, hoyISO } from "./pagos.js";

// Seguimiento de siniestros de un cliente. Se guarda dentro del propio cliente (c.siniestros),
// así viaja con los respaldos y con la exportación de la cartera.

export const TIPOS_SINIESTRO = ["Choque", "Robo", "Daños a terceros", "Cristales", "Gastos médicos", "Hospitalización", "Hogar", "Otro"];
export const ESTATUS_SINIESTRO = ["Reportado", "En proceso", "Documentos pendientes", "Pagado", "Rechazado", "Cerrado"];
const CERRADOS = ["Pagado", "Rechazado", "Cerrado"];
const COLOR_ESTATUS = {
  "Reportado": "#2B5C86", "En proceso": "#B8892B", "Documentos pendientes": "#C2610C",
  "Pagado": "#1E5C4C", "Rechazado": "#B23A2E", "Cerrado": "#5C6B78",
};

export const siniestrosAbiertos = (c) => (c.siniestros || []).filter((s) => !CERRADOS.includes(s.estatus)).length;

const campo = { width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff", color: "var(--ink)", fontFamily: "inherit" };
const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--stone)", margin: "10px 0 4px" };
const btn = { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const btnPrim = { ...btn, background: "var(--ink)", color: "#fff", border: "none" };

// dd/mm/aaaa -> aaaa-mm-dd (o "" si no es válida)
function aISO(txt) {
  const m = String(txt || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const d = Number(m[1]); const mo = Number(m[2]); const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
const aMonto = (v) => { const n = Number(String(v || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; };

const VACIO = { fecha: "", polizaId: "", tipo: TIPOS_SINIESTRO[0], numero: "", reclamado: "", descripcion: "" };

export default function SiniestrosCliente({ client, onChange }) {
  const lista = client.siniestros || [];
  const polizas = client.polizas || [];
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [notas, setNotas] = useState({});

  const guardarLista = (fn) => onChange(fn(lista));

  function enviar(e) {
    e.preventDefault();
    const fecha = aISO(form.fecha);
    if (!fecha) { setError("Escribe la fecha del siniestro como dd/mm/aaaa."); return; }
    const poliza = polizas.find((p) => p.id === form.polizaId) || null;
    const nuevo = {
      id: `${Date.now()}`,
      fecha,
      polizaId: poliza ? poliza.id : "",
      aseguradora: poliza ? poliza.aseguradora : "",
      numeroPoliza: poliza ? poliza.numeroPoliza : "",
      tipo: form.tipo,
      numero: form.numero.trim(),
      reclamado: aMonto(form.reclamado),
      pagado: 0,
      descripcion: form.descripcion.trim(),
      estatus: "Reportado",
      historial: [{ id: `${Date.now()}-h`, fecha: hoyISO(), estatus: "Reportado", nota: "Siniestro registrado" }],
    };
    guardarLista((l) => [nuevo, ...l]);
    setForm(null);
    setError("");
  }

  const actualizar = (id, fn) => guardarLista((l) => l.map((s) => (s.id === id ? fn(s) : s)));

  function cambiarEstatus(s, estatus) {
    if (estatus === s.estatus) return;
    actualizar(s.id, (x) => ({
      ...x, estatus,
      historial: [...(x.historial || []), { id: `${Date.now()}-h`, fecha: hoyISO(), estatus, nota: "" }],
    }));
  }

  function agregarNota(s) {
    const t = (notas[s.id] || "").trim();
    if (!t) return;
    actualizar(s.id, (x) => ({ ...x, historial: [...(x.historial || []), { id: `${Date.now()}-n`, fecha: hoyISO(), estatus: x.estatus, nota: t }] }));
    setNotas((n) => ({ ...n, [s.id]: "" }));
  }

  function guardarPagado(s, valor) {
    actualizar(s.id, (x) => ({ ...x, pagado: aMonto(valor) }));
  }

  function borrar(s) {
    if (window.confirm("¿Eliminar este siniestro y su historial?")) guardarLista((l) => l.filter((x) => x.id !== s.id));
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!form && (
        <button type="button" style={{ ...btnPrim, justifySelf: "start" }} onClick={() => { setForm({ ...VACIO, polizaId: polizas[0]?.id || "" }); setError(""); }}>
          <Plus size={15} /> Registrar siniestro
        </button>
      )}

      {form && (
        <form onSubmit={enviar} className="panel" style={{ padding: 14 }}>
          <h3 className="serif" style={{ fontSize: 16, marginBottom: 4 }}>Nuevo siniestro</h3>
          {error && <p style={{ color: "#B23A2E", fontSize: 13 }}>{error}</p>}
          <label style={etiqueta}>Fecha del siniestro (dd/mm/aaaa)</label>
          <input style={campo} inputMode="numeric" placeholder="dd/mm/aaaa" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          <label style={etiqueta}>Póliza</label>
          <select style={campo} value={form.polizaId} onChange={(e) => setForm({ ...form, polizaId: e.target.value })}>
            <option value="">Sin póliza específica</option>
            {polizas.map((p) => <option key={p.id} value={p.id}>{p.aseguradora} · {p.ramo} · {p.numeroPoliza || "sin número"}</option>)}
          </select>
          <label style={etiqueta}>Tipo</label>
          <select style={campo} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS_SINIESTRO.map((t) => <option key={t}>{t}</option>)}
          </select>
          <label style={etiqueta}>Número de reporte o siniestro (opcional)</label>
          <input style={campo} value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
          <label style={etiqueta}>Monto reclamado (opcional)</label>
          <input style={campo} inputMode="decimal" placeholder="0" value={form.reclamado} onChange={(e) => setForm({ ...form, reclamado: e.target.value })} />
          <label style={etiqueta}>¿Qué pasó? (opcional)</label>
          <textarea style={{ ...campo, minHeight: 70 }} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button type="submit" style={btnPrim}>Guardar</button>
            <button type="button" style={btn} onClick={() => { setForm(null); setError(""); }}>Cancelar</button>
          </div>
        </form>
      )}

      {lista.length === 0 && !form && (
        <p style={{ color: "var(--stone)", fontSize: 13.5, textAlign: "center", padding: "14px 4px" }}>Este cliente no tiene siniestros registrados.</p>
      )}

      {lista.map((s) => {
        const color = COLOR_ESTATUS[s.estatus] || "var(--stone)";
        return (
          <div key={s.id} className="panel" style={{ padding: 12, display: "grid", gap: 10, borderLeft: `3px solid ${color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                {s.aseguradora && <InsurerMark name={s.aseguradora} w={44} h={26} radius={7} fontSize={11} />}
                <div style={{ minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 14.5 }}>{s.tipo}{s.numero ? ` · #${s.numero}` : ""}</b>
                  <small style={{ color: "var(--stone)", fontSize: 12 }}>{fmtDateFull(s.fecha)}{s.numeroPoliza ? ` · póliza ${s.numeroPoliza}` : ""}</small>
                </div>
              </div>
              <button type="button" onClick={() => borrar(s)} aria-label="Eliminar siniestro" style={{ background: "none", border: "none", color: "#B23A2E", padding: 4, cursor: "pointer" }}><Trash2 size={16} /></button>
            </div>

            {s.descripcion && <p style={{ fontSize: 13, lineHeight: 1.45 }}>{s.descripcion}</p>}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={s.estatus} onChange={(e) => cambiarEstatus(s, e.target.value)} aria-label="Estatus del siniestro" style={{ ...campo, width: "auto", fontWeight: 700, color }}>
                {ESTATUS_SINIESTRO.map((e) => <option key={e}>{e}</option>)}
              </select>
              {s.reclamado > 0 && <small style={{ color: "var(--stone)", fontSize: 12.5 }}>Reclamado: <b>{fmtMonto(s.reclamado)}</b></small>}
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--stone)" }}>
                Pagado:
                <input defaultValue={s.pagado || ""} inputMode="decimal" placeholder="0" onBlur={(e) => guardarPagado(s, e.target.value)} style={{ ...campo, width: 100, padding: "6px 8px" }} />
              </label>
            </div>

            {client.telefono && !CERRADOS.includes(s.estatus) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <a style={{ ...btn, background: "#E7F5EC", color: "#1E5C4C", border: "1px solid #BFE0CB", textDecoration: "none" }}
                  href={`https://wa.me/${String(client.telefono).replace(/\D/g, "").replace(/^(\d{10})$/, "52$1")}?text=${encodeURIComponent(`Hola ${client.nombre}, te escribo para darte seguimiento a tu siniestro${s.numero ? ` #${s.numero}` : ""} (estatus: ${s.estatus}). Cualquier duda o documento que necesites, aquí estoy.`)}`}
                  target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
                <a style={{ ...btn, textDecoration: "none" }} href={`tel:${String(client.telefono).replace(/\D/g, "")}`}><Phone size={14} /> Llamar</a>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8, display: "grid", gap: 6 }}>
              <small style={{ fontWeight: 700, color: "var(--stone)", fontSize: 12 }}>Historial</small>
              {[...(s.historial || [])].reverse().map((h) => (
                <div key={h.id} style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                  <span style={{ color: "var(--stone)" }}>{fmtDateFull(h.fecha)} · </span>
                  <b style={{ color: COLOR_ESTATUS[h.estatus] || "var(--ink)" }}>{h.estatus}</b>
                  {h.nota ? <span> — {h.nota}</span> : null}
                </div>
              ))}
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ ...campo, padding: "7px 10px", fontSize: 13 }} placeholder="Agregar nota (ej. envié documentos)" value={notas[s.id] || ""}
                  onChange={(e) => setNotas((n) => ({ ...n, [s.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarNota(s); } }} />
                <button type="button" style={btn} onClick={() => agregarNota(s)}>Agregar</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
