import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Share2, Download, ExternalLink, X } from "lucide-react";
import PageHeader from "./PageHeader.jsx";
import { mountDiagnostico, crearCasoVacio, crearCasoEjemplo } from "./diagPat/engine.js";
import logo from "./diagPat/logo.png";
import qr from "./diagPat/qr.png";
import foto from "./diagPat/asesor.jpg";
import "./DiagnosticoPatrimonial.css";

const KEY = "dpat_casos";
const slug = (s) => String(s || "cliente").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cliente";
const CAMPOS_ASESOR = ["asesor", "asesorTit", "asesorWA", "asesorMail", "infl", "rend", "inflEdu", "costoCarrera", "udi", "tc", "descConyuge"];

function fechaDdMmAaaa(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  return Number(m[1]) > new Date().getFullYear() - 16 ? "" : `${m[3]}/${m[2]}/${m[1]}`;
}

export default function DiagnosticoPatrimonial({ clients = [], prospectos = [], agente = "", correo = "" }) {
  const [casos, setCasos] = useState(null);
  const [abierto, setAbierto] = useState(null); // id del caso, o "ejemplo"
  const [ejemplo, setEjemplo] = useState(null);
  const [modal, setModal] = useState(false);
  const [vinc, setVinc] = useState({ tipo: "", id: "" });
  const [pdf, setPdf] = useState(null); // { url, blob, nombre, error }
  const [err, setErr] = useState("");
  const casosRef = useRef(null);
  const timer = useRef(null);
  const ref = useRef(null);
  const eng = useRef(null);
  casosRef.current = casos;

  useEffect(() => { (async () => { try { const r = await window.storage.get(KEY); setCasos(r && r.value ? JSON.parse(r.value) : []); } catch { setCasos([]); } })(); }, []);

  const guardarYa = useCallback(async () => {
    clearTimeout(timer.current);
    const lista = casosRef.current;
    if (!lista) return;
    try { await window.storage.set(KEY, JSON.stringify(lista)); setErr(""); } catch { setErr("No se pudo guardar. Revisa tu conexión."); }
  }, []);
  const programar = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(guardarYa, 600); }, [guardarYa]);
  useEffect(() => () => { if (timer.current) guardarYa(); }, [guardarYa]);

  const caso = abierto === "ejemplo" ? ejemplo : casos?.find((c) => c.id === abierto);

  function cerrar() { guardarYa(); setAbierto(null); }

  async function hacerPdf() {
    try {
      const { generarPdf } = await import("./diagPat/pdf.js");
      const blob = await generarPdf(eng.current.reportHtml(), { alProgreso: (i, n) => { const b = document.querySelector('.dp [data-act="pdf"]'); if (b) b.textContent = `Generando PDF… ${i}/${n}`; } });
      const nombre = `Diagnostico-patrimonial-${slug(eng.current.state().nombre)}.pdf`;
      setPdf({ blob, url: URL.createObjectURL(blob), nombre });
    } catch (e) {
      setPdf({ error: String(e?.message || e) });
    }
  }

  useEffect(() => {
    if (!caso || !ref.current) return undefined;
    const c = caso;
    const e = mountDiagnostico(ref.current, {
      state: c.data, logo, qr, foto, tab: c.tab || "entrevista",
      onTab: (t) => { c.tab = t; },
      onChange: () => {
        if (abierto === "ejemplo") return;
        c.nombre = c.data.nombre || "";
        c.actualizado = new Date().toISOString();
        setCasos((l) => (l ? [...l] : l));
        programar();
      },
      onBack: cerrar,
      onPdf: hacerPdf,
    });
    eng.current = e;
    return () => { e.destroy(); eng.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  function crear() {
    const d = crearCasoVacio();
    const base = casos?.find((c) => c.data?.asesor);
    if (base) CAMPOS_ASESOR.forEach((k) => { if (base.data[k] !== undefined) d[k] = base.data[k]; });
    else { if (agente) d.asesor = agente; if (correo) d.asesorMail = correo; }
    let vinculo = null;
    if (vinc.tipo === "prospecto") {
      const p = prospectos.find((x) => String(x.id) === vinc.id);
      if (p) { d.nombre = p.nombre || ""; d.tel = p.telefono || ""; d.correo = p.correo || ""; vinculo = { tipo: "prospecto", id: p.id }; }
    } else if (vinc.tipo === "cliente") {
      const cl = clients.find((x) => String(x.id) === vinc.id);
      if (cl) { d.nombre = [cl.nombre, cl.apellido].filter(Boolean).join(" "); d.tel = cl.telefono || ""; d.correo = cl.correo || ""; d.nacimiento = fechaDdMmAaaa(cl.fechaCumple); vinculo = { tipo: "cliente", id: cl.id }; }
    }
    const nuevo = { id: `dp-${Date.now()}`, creado: new Date().toISOString(), actualizado: new Date().toISOString(), nombre: d.nombre, vinculo, tab: "entrevista", data: d };
    const lista = [nuevo, ...(casos || [])];
    setCasos(lista); casosRef.current = lista; guardarYa();
    setModal(false); setVinc({ tipo: "", id: "" }); setAbierto(nuevo.id);
  }

  if (casos === null) return <div style={{ padding: 40, textAlign: "center", color: "var(--stone)" }}>Cargando…</div>;

  const cerrarPdf = () => { if (pdf?.url) URL.revokeObjectURL(pdf.url); setPdf(null); };
  async function compartir() {
    try {
      const f = new File([pdf.blob], pdf.nombre, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: pdf.nombre });
    } catch { /* el usuario canceló */ }
  }
  const puedeCompartir = typeof navigator !== "undefined" && navigator.canShare && pdf?.blob && (() => { try { return navigator.canShare({ files: [new File([pdf.blob], pdf.nombre, { type: "application/pdf" })] }); } catch { return false; } })();

  const ventanaPdf = pdf && (
    <div className="dpl-modal" role="dialog" aria-modal="true" onClick={cerrarPdf}>
      <div className="dpl-card" onClick={(e) => e.stopPropagation()}>
        {pdf.error ? (<><h3>No se pudo generar el PDF</h3><p>{pdf.error}</p></>) : (<><h3>Tu PDF está listo</h3><p>{pdf.nombre}</p>
          <div className="fila">
            {puedeCompartir && <button className="dpl-btn gold" onClick={compartir}><Share2 size={16} /> Compartir o guardar</button>}
            <a className={`dpl-btn ${puedeCompartir ? "" : "gold"}`} href={pdf.url} download={pdf.nombre}><Download size={16} /> Descargar</a>
            <a className="dpl-btn" href={pdf.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Abrir</a>
          </div>
          <p style={{ fontSize: 12.5 }}>En iPad, "Compartir o guardar" te deja mandarlo por WhatsApp o guardarlo en Archivos.</p></>)}
        <button className="dpl-btn" onClick={cerrarPdf}><X size={16} /> Cerrar</button>
      </div>
    </div>
  );

  if (caso) {
    return (
      <div>
        <PageHeader eyebrow="Herramientas" title="Diagnóstico patrimonial" subtitle={caso.data.nombre || "Nuevo diagnóstico"} />
        {err && <p style={{ color: "#B23A2E" }}>{err}</p>}
        <div className="dp" ref={ref} />
        {ventanaPdf}
      </div>
    );
  }

  return (
    <div className="dpl">
      <PageHeader eyebrow="Herramientas" title="Diagnóstico patrimonial" subtitle="Entrevista, producto y entregable visual para tu cliente"
        action={<button className="dpl-btn gold" onClick={() => setModal(true)}><Plus size={16} /> Nuevo diagnóstico</button>} />
      {err && <p style={{ color: "#B23A2E" }}>{err}</p>}
      <div className="dpl-bar"><button className="dpl-btn" onClick={() => { const d = crearCasoEjemplo(); setEjemplo({ id: "ejemplo", nombre: d.nombre, tab: "entregable", data: d }); setAbierto("ejemplo"); }}>Ver caso de ejemplo</button></div>
      {casos.length === 0 && <div className="dpl-vacio"><b>Aún no hay diagnósticos</b><p>Crea uno para capturar la entrevista, definir el producto y descargar el entregable con gráficas, proyecciones y tu QR.</p></div>}
      {casos.map((c) => (
        <div key={c.id} className="dpl-caso">
          <button className="dpl-abrir" onClick={() => setAbierto(c.id)}>
            <i>{(c.nombre || "?").trim().charAt(0).toUpperCase() || "?"}</i>
            <span><b>{c.nombre || "Sin nombre"}</b><small>{new Date(c.actualizado || c.creado).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}{c.vinculo ? ` · ${c.vinculo.tipo}` : ""}</small></span>
          </button>
          <button className="dpl-btn danger" aria-label="Eliminar" onClick={() => { if (window.confirm("¿Eliminar este diagnóstico?")) { const l = casos.filter((x) => x.id !== c.id); setCasos(l); casosRef.current = l; guardarYa(); } }}><Trash2 size={16} /></button>
        </div>
      ))}
      {modal && (
        <div className="dpl-modal" role="dialog" aria-modal="true" onClick={() => setModal(false)}>
          <div className="dpl-card" onClick={(e) => e.stopPropagation()}>
            <h3>Nuevo diagnóstico</h3>
            <p>Si ya está en tu CRM, vincúlalo y se llenan sus datos de contacto.</p>
            <label>Prospecto<select value={vinc.tipo === "prospecto" ? vinc.id : ""} onChange={(e) => setVinc(e.target.value ? { tipo: "prospecto", id: e.target.value } : { tipo: "", id: "" })}><option value="">Ninguno</option>{prospectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
            <label>Cliente<select value={vinc.tipo === "cliente" ? vinc.id : ""} onChange={(e) => setVinc(e.target.value ? { tipo: "cliente", id: e.target.value } : { tipo: "", id: "" })}><option value="">Ninguno</option>{clients.map((c) => <option key={c.id} value={c.id}>{[c.nombre, c.apellido].filter(Boolean).join(" ")}</option>)}</select></label>
            <div className="fila"><button className="dpl-btn gold" onClick={crear}>Crear diagnóstico</button><button className="dpl-btn" onClick={() => setModal(false)}>Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
