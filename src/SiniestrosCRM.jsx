import React, { useEffect, useState } from "react";
import { Plus, Trash2, Phone, FileText, Upload, ChevronDown } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { InsurerMark } from "./insurerLogos.jsx";
import PageHeader from "./PageHeader.jsx";

// Información para reportar siniestros: la captura el agente y la ve el cliente en su portal.
const KEY = "siniestros_info";
const BUCKET = "documentos";
const INICIAL = [
  { n: "AXA", t: [["", "800 911 1292"]] },
  { n: "Qualitas", t: [["", "800 800 2880"]] },
  { n: "Chubb", t: [["", "800 223 2001"]] },
  { n: "Banorte", t: [["", "800 500 1500"]] },
  { n: "Plan Seguro", t: [["", "800 277 1234"]] },
  { n: "HDI", t: [["", "800 667 3144"]] },
  { n: "Mapfre", t: [["", "800 062 7373"]] },
  { n: "ANA", t: [["", "800 835 3262"]] },
  { n: "Afirme", t: [["MTY", "81 8318 3800"], ["CDMX", "55 5140 3000"], ["Zapopan", "33 3880 7400"], ["Chihuahua", "614 432 6210"], ["Resto del país", "800 734 8761"]] },
].map((x, i) => ({ id: `ini-${i}`, aseguradora: x.n, telefonos: x.t.map(([lugar, numero]) => ({ lugar, numero })), instrucciones: "", docs: [] }));

const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-60);
const campo = { width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff", color: "var(--ink)", fontFamily: "inherit" };
const btn = { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", borderRadius: 10, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" };

export default function SiniestrosCRM() {
  const [lista, setLista] = useState(null);
  const [abierto, setAbierto] = useState("");
  const [guardado, setGuardado] = useState("");
  const [err, setErr] = useState("");
  const [subiendo, setSubiendo] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(KEY);
        setLista(res && res.value ? JSON.parse(res.value) : INICIAL);
      } catch (e) { setLista(INICIAL); }
    })();
  }, []);

  async function guardar(nueva) {
    setLista(nueva);
    try { await window.storage.set(KEY, JSON.stringify(nueva)); setGuardado("Guardado"); setTimeout(() => setGuardado(""), 1500); setErr(""); }
    catch (e) { setErr("No se pudo guardar. Revisa tu conexión."); }
  }
  const cambiar = (id, fn) => guardar(lista.map((x) => (x.id === id ? fn(x) : x)));
  const nueva = () => { const id = `s-${Date.now()}`; guardar([...lista, { id, aseguradora: "", telefonos: [{ lugar: "", numero: "" }], instrucciones: "", docs: [] }]); setAbierto(id); };
  const quitar = (id) => { if (window.confirm("¿Eliminar esta aseguradora de la lista de siniestros?")) guardar(lista.filter((x) => x.id !== id)); };

  async function subir(id, files) {
    setErr(""); setSubiendo(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión activa.");
      const nuevos = [];
      for (const f of files) {
        const path = `siniestros/${user.id}/${Date.now()}-${nuevos.length}-${slug(f.name)}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, f, { upsert: true });
        if (error) throw error;
        nuevos.push({ id: `${Date.now()}-${nuevos.length}`, name: f.name, path });
      }
      await cambiar(id, (x) => ({ ...x, docs: [...(x.docs || []), ...nuevos] }));
    } catch (e) { setErr(`No se pudo subir el archivo: ${e.message || e}`); }
    setSubiendo("");
  }
  async function abrirDoc(d) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.path, 3600);
    if (error || !data) { setErr("No se pudo abrir el archivo."); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (!lista) return <p style={{ color: "var(--muted)" }}>Cargando…</p>;
  return (
    <div className="stagger">
      <PageHeader eyebrow="Herramientas" title="Siniestros" subtitle="Teléfonos e instrucciones por aseguradora. Tus clientes lo ven en la sección “Reportar siniestro” de su portal." />
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={nueva} style={{ ...btn, background: "var(--ink)", color: "#fff", border: "none" }}><Plus size={15} /> Agregar aseguradora</button>
        {guardado && <small style={{ color: "var(--emerald)", fontWeight: 600 }}>{guardado}</small>}
        {err && <small style={{ color: "#B23A2E" }}>{err}</small>}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {lista.map((x) => {
          const on = abierto === x.id;
          return (
            <section key={x.id} className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <button type="button" onClick={() => setAbierto(on ? "" : x.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "inherit" }}>
                <InsurerMark name={x.aseguradora || "?"} w={52} h={30} radius={8} fontSize={12} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 15 }}>{x.aseguradora || "Nueva aseguradora"}</b>
                  <small style={{ color: "var(--stone)", fontSize: 12 }}>{(x.telefonos || []).filter((t) => t.numero).length} teléfono(s){x.instrucciones ? " · con instrucciones" : ""}{(x.docs || []).length ? ` · ${x.docs.length} archivo(s)` : ""}</small>
                </span>
                <ChevronDown size={18} color="var(--stone)" style={{ transform: on ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
              </button>
              {on && (
                <div style={{ padding: "0 14px 14px", display: "grid", gap: 10, animation: "rise .3s cubic-bezier(.2,.7,.2,1)" }}>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Aseguradora</label>
                    <input value={x.aseguradora} onChange={(e) => setLista(lista.map((y) => (y.id === x.id ? { ...y, aseguradora: e.target.value } : y)))} onBlur={() => guardar(lista)} style={campo} placeholder="Ej. GNP Seguros" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Teléfonos de siniestros</label>
                    {(x.telefonos || []).map((t, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr) auto", gap: 6, marginTop: 6 }}>
                        <input value={t.lugar} placeholder="Zona (opcional)" onChange={(e) => setLista(lista.map((y) => (y.id === x.id ? { ...y, telefonos: y.telefonos.map((z, k) => (k === i ? { ...z, lugar: e.target.value } : z)) } : y)))} onBlur={() => guardar(lista)} style={campo} />
                        <input value={t.numero} placeholder="800 000 0000" inputMode="tel" onChange={(e) => setLista(lista.map((y) => (y.id === x.id ? { ...y, telefonos: y.telefonos.map((z, k) => (k === i ? { ...z, numero: e.target.value } : z)) } : y)))} onBlur={() => guardar(lista)} style={campo} />
                        <button type="button" aria-label="Quitar teléfono" onClick={() => cambiar(x.id, (y) => ({ ...y, telefonos: y.telefonos.filter((_, k) => k !== i) }))} style={{ ...btn, padding: "7px 9px" }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => cambiar(x.id, (y) => ({ ...y, telefonos: [...(y.telefonos || []), { lugar: "", numero: "" }] }))} style={{ ...btn, marginTop: 8 }}><Phone size={14} /> Agregar teléfono</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Instrucciones para reportar (qué datos y documentos pedir, horarios, app, etc.)</label>
                    <textarea rows={4} value={x.instrucciones || ""} onChange={(e) => setLista(lista.map((y) => (y.id === x.id ? { ...y, instrucciones: e.target.value } : y)))} onBlur={() => guardar(lista)} style={campo} placeholder="Ej. Llama al 800…, ten a la mano tu número de póliza, fotos del daño y licencia vigente." />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Archivos (PDF o imagen: guías, formatos, cartas de asistencia)</label>
                    {(x.docs || []).map((d) => (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                        <FileText size={15} color="var(--gold-text)" />
                        <button type="button" onClick={() => abrirDoc(d)} className="link-btn" style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</button>
                        <button type="button" aria-label="Quitar archivo" onClick={() => cambiar(x.id, (y) => ({ ...y, docs: y.docs.filter((z) => z.id !== d.id) }))} style={{ ...btn, padding: "5px 8px" }}><Trash2 size={13} /></button>
                      </div>
                    ))}
                    <label style={{ ...btn, marginTop: 8, opacity: subiendo === x.id ? 0.6 : 1 }}>
                      <Upload size={14} /> {subiendo === x.id ? "Subiendo…" : "Subir archivo"}
                      <input type="file" accept="application/pdf,image/*" multiple style={{ display: "none" }} onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ""; if (f.length) subir(x.id, f); }} />
                    </label>
                  </div>
                  <button type="button" onClick={() => quitar(x.id)} style={{ ...btn, color: "#B23A2E", justifySelf: "start" }}><Trash2 size={14} /> Eliminar aseguradora</button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
