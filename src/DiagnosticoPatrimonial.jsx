import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Share2, Download, ExternalLink, X, UserCog } from "lucide-react";
import PageHeader from "./PageHeader.jsx";
import PerfilAsesor from "./PerfilAsesor.jsx";
import { supabase } from "./supabaseClient.js";
import { mountDiagnostico, crearCasoVacio, crearCasoEjemplo } from "./diagPat/engine.js";
import logo from "./diagPat/logo.png";
import qr from "./diagPat/qr.png";
import foto from "./diagPat/asesor.jpg";
import "./DiagnosticoPatrimonial.css";

const KEY = "dpat_casos";
const slug = (s) => String(s || "cliente").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cliente";
const PERFIL_KEY = "dpat_perfil";
const CAMPOS_ASESOR = ["infl", "rend", "inflEdu", "costoCarrera", "udi", "tc", "descConyuge"];
const JOSHUA_CORREO = "jlechuga.seguros@gmail.com";
const TITULO_BASE = "Asesor en protección y planeación patrimonial";
// Presentación inicial de la cuenta de Joshua (los demás agentes empiezan con la suya vacía y la escriben ellos).
const SOBRE_JOSHUA = [
  "Soy asesor especializado en ayudar a familias, emprendedores y profesionistas a tomar decisiones financieras inteligentes para proteger lo que más les importa y construir un futuro con mayor certeza.",
  "Desde hace más de diez años me dedico a analizar la situación financiera de cada cliente de forma personalizada, identificando riesgos, oportunidades de protección y estrategias que les permitan cuidar su patrimonio y el bienestar de su familia.",
  "Mi enfoque no es vender productos, sino entender a las personas, sus objetivos, sus preocupaciones y lo que quieren construir a largo plazo. A partir de ese análisis, diseño soluciones de protección financiera claras, sostenibles y alineadas a cada etapa de la vida.",
  "Creo firmemente que una buena planeación financiera no solo protege el presente, sino que también permite construir tranquilidad y legado para las personas que más queremos.",
].join("\n\n");

async function urlADataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(blob); });
}

function fechaDdMmAaaa(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  return Number(m[1]) > new Date().getFullYear() - 16 ? "" : `${m[3]}/${m[2]}/${m[1]}`;
}

export default function DiagnosticoPatrimonial({ clients = [], prospectos = [], agente = "", correo = "" }) {
  const [casos, setCasos] = useState(null);
  const [perfil, setPerfil] = useState(null); // datos del asesor para el entregable
  const [perfilModal, setPerfilModal] = useState(false);
  const perfilRef = useRef(null);
  perfilRef.current = perfil;
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

  useEffect(() => {
    (async () => {
      let lista = [];
      try { const r = await window.storage.get(KEY); lista = r && r.value ? JSON.parse(r.value) : []; } catch { /* se queda vacío */ }
      setCasos(lista);
      let p = null;
      let leido = true;
      try { const r = await window.storage.get(PERFIL_KEY); if (r && r.value) p = JSON.parse(r.value); } catch { leido = false; }
      if (!p) {
        p = await sembrarPerfil(lista);
        if (leido) { try { await window.storage.set(PERFIL_KEY, JSON.stringify(p)); } catch { /* se intentará al guardar */ } }
      }
      perfilRef.current = p;
      setPerfil(p);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Primera vez: arma el perfil con lo que ya hay en la cuenta (nombre y correo del CRM, datos de diagnósticos anteriores).
  async function sembrarPerfil(lista) {
    let email = "";
    try { const { data } = await supabase.auth.getUser(); email = (data?.user?.email || "").toLowerCase(); } catch { /* sin correo de sesión */ }
    const esJoshua = email === JOSHUA_CORREO || String(correo || "").toLowerCase() === JOSHUA_CORREO;
    const base = (lista.find((c) => c.data?.asesor) || {}).data || {};
    const p = { nombre: "", titulo: base.asesorTit || TITULO_BASE, whatsapp: "", correo: "", web: "", sobreMi: "", qrLeyenda: "", fotoUrl: "", qrUrl: "", logoUrl: "" };
    if (esJoshua) {
      p.nombre = base.asesor || "Joshua Lechuga Plata";
      p.whatsapp = base.asesorWA || "244 107 1011";
      p.correo = base.asesorMail || JOSHUA_CORREO;
      p.sobreMi = SOBRE_JOSHUA;
      try { p.fotoUrl = await urlADataUrl(foto); p.qrUrl = await urlADataUrl(qr); } catch { /* quedan vacíos */ }
    } else {
      p.nombre = base.asesor && base.asesor !== "Joshua Lechuga Plata" ? base.asesor : agente || "";
      p.whatsapp = base.asesorWA && base.asesorWA !== "244 107 1011" ? base.asesorWA : "";
      p.correo = base.asesorMail && base.asesorMail !== JOSHUA_CORREO ? base.asesorMail : correo || "";
    }
    return p;
  }

  async function guardarPerfil(nuevo) {
    try { await window.storage.set(PERFIL_KEY, JSON.stringify(nuevo)); } catch { return false; }
    perfilRef.current = nuevo;
    setPerfil(nuevo);
    setPerfilModal(false);
    if (eng.current && eng.current.refresh) eng.current.refresh();
    return true;
  }

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
      state: c.data, logo, tab: c.tab || "entrevista",
      get perfil() { return perfilRef.current; },
      onEditarPerfil: () => setPerfilModal(true),
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
    const base = casos?.find((c) => c.data?.infl !== undefined);
    if (base) CAMPOS_ASESOR.forEach((k) => { if (base.data[k] !== undefined) d[k] = base.data[k]; });
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

  const modalPerfil = perfilModal && perfil && <PerfilAsesor perfil={perfil} onGuardar={guardarPerfil} onCerrar={() => setPerfilModal(false)} logoPredeterminado={logo} />;

  if (casos === null || perfil === null) return <div style={{ padding: 40, textAlign: "center", color: "var(--stone)" }}>Cargando…</div>;

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
        {modalPerfil}
      </div>
    );
  }

  return (
    <div className="dpl">
      <PageHeader eyebrow="Herramientas" title="Diagnóstico patrimonial" subtitle="Entrevista, producto y entregable visual para tu cliente"
        action={<button className="dpl-btn gold" onClick={() => setModal(true)}><Plus size={16} /> Nuevo diagnóstico</button>} />
      {err && <p style={{ color: "#B23A2E" }}>{err}</p>}
      <div className="dpl-bar"><button className="dpl-btn" onClick={() => setPerfilModal(true)}><UserCog size={16} /> Mis datos de asesor</button><button className="dpl-btn" onClick={() => { const d = crearCasoEjemplo(); setEjemplo({ id: "ejemplo", nombre: d.nombre, tab: "entregable", data: d }); setAbierto("ejemplo"); }}>Ver caso de ejemplo</button></div>
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
      {modalPerfil}
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
