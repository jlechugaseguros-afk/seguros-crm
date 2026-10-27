import React, { useState } from "react";
import { Plus, Trash2, Upload, Download, X, FileText, RotateCcw, ChevronDown } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { InsurerMark } from "../insurerLogos.jsx";
import { RAMOS } from "./catalogoBase.js";
import { dinero } from "./calculos.js";

const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-60);
const lista = (txt) => String(txt || "").split(/[,\n]/).map((x) => parseFloat(x.replace(/[^\d.]/g, ""))).filter((x) => Number.isFinite(x));
const lineas = (txt) => String(txt || "").split("\n").map((x) => x.trim()).filter(Boolean);
const ASEGURADORAS = ["AXA", "GNP", "MetLife", "Allianz", "Banorte", "Mapfre", "Zurich", "Chubb", "Plan Seguro", "Otra"];
const TIPOS = { vida: ["temporal", "vitalicio", "ordinario"], ppr: ["retiro"], educacion: ["educacion"], gmm: ["gmm"] };
const VACIO = { aseguradora: "AXA", ramo: "vida", tipo: "temporal", nombre: "", descripcion: "", moneda: ["MXN"], edadMin: 18, edadMax: 70, notas: "", coberturas: [], docs: [] };

function Campo({ etiqueta, children, ancho }) {
  return <label className="dg-campo" style={ancho ? { gridColumn: `span ${ancho}` } : undefined}><span>{etiqueta}</span>{children}</label>;
}

function Formulario({ inicial, onGuardar, onCerrar }) {
  const [p, setP] = useState({
    ...VACIO, ...inicial,
    _sumas: (inicial.sumas || []).join(", "), _deducibles: (inicial.deducibles || []).join(", "),
    _coaseguros: (inicial.coaseguros || []).join(", "), _coberturas: (inicial.coberturas || []).join("\n"),
    _aseguradoraOtra: inicial.aseguradora && !ASEGURADORAS.includes(inicial.aseguradora) ? inicial.aseguradora : "",
  });
  const [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const nuevo = !inicial.id;

  async function subir(files) {
    setErr(""); setSubiendo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión activa.");
      const docs = [...(p.docs || [])];
      for (const f of files) {
        const path = `diagnostico/${user.id}/${Date.now()}-${docs.length}-${slug(f.name)}`;
        const { error } = await supabase.storage.from("documentos").upload(path, f, { upsert: true });
        if (error) throw error;
        docs.push({ nombre: f.name, path });
      }
      set("docs", docs);
    } catch (e) { setErr(e.message || "No se pudo subir el archivo."); }
    setSubiendo(false);
  }
  async function abrir(d) {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(d.path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  }

  function guardar() {
    if (!p.nombre.trim()) { setErr("Escribe el nombre del producto."); return; }
    const aseguradora = p.aseguradora === "Otra" ? p._aseguradoraOtra.trim() || "Otra" : p.aseguradora;
    const out = {
      id: inicial.id || `custom-${Date.now()}`, aseguradora, ramo: p.ramo, tipo: p.tipo, nombre: p.nombre.trim(),
      descripcion: p.descripcion, moneda: p.moneda, edadMin: Number(p.edadMin) || 0, edadMax: Number(p.edadMax) || 120,
      notas: p.notas, plazos: p.plazos || "", coberturas: lineas(p._coberturas), docs: p.docs || [],
    };
    ["sumaMin", "primaMinAnual", "edadHijoMax"].forEach((k) => { if (Number(p[k])) out[k] = Number(p[k]); });
    if (p.ramo === "gmm") {
      out.sumas = lista(p._sumas); out.deducibles = lista(p._deducibles); out.coaseguros = lista(p._coaseguros);
      if (inicial.topesCoaseguro) out.topesCoaseguro = inicial.topesCoaseguro;
    }
    if (p.ramo === "ppr") {
      out.retiroEdad = Number(p.retiroEdad) || 65; out.fiscal = p.fiscal || "";
      if (inicial.fondos) out.fondos = inicial.fondos;
      if (inicial.retiroEdades) out.retiroEdades = inicial.retiroEdades;
    }
    if (p.ramo === "educacion" && inicial.sumaEnUdi) { out.sumaEnUdi = true; out.sumaMax = inicial.sumaMax; }
    onGuardar(out);
  }

  return (
    <div className="dg-panel">
      <div className="dg-panel-cab"><strong>{nuevo ? "Agregar producto" : "Editar producto"}</strong><button className="dg-icono" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button></div>
      <div className="dg-rejilla">
        <Campo etiqueta="Aseguradora">
          <select value={p.aseguradora} onChange={(e) => set("aseguradora", e.target.value)}>{ASEGURADORAS.map((a) => <option key={a}>{a}</option>)}</select>
        </Campo>
        {p.aseguradora === "Otra" && <Campo etiqueta="Nombre de la aseguradora"><input value={p._aseguradoraOtra} onChange={(e) => set("_aseguradoraOtra", e.target.value)} /></Campo>}
        <Campo etiqueta="Ramo">
          <select value={p.ramo} onChange={(e) => { set("ramo", e.target.value); set("tipo", TIPOS[e.target.value][0]); }}>{RAMOS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
        </Campo>
        {p.ramo === "vida" && <Campo etiqueta="Tipo"><select value={p.tipo} onChange={(e) => set("tipo", e.target.value)}><option value="temporal">Temporal</option><option value="vitalicio">Vitalicio / ordinario</option></select></Campo>}
        <Campo etiqueta="Nombre del producto" ancho={2}><input value={p.nombre} onChange={(e) => set("nombre", e.target.value)} /></Campo>
        <Campo etiqueta="Descripción corta" ancho={2}><input value={p.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} /></Campo>
        <Campo etiqueta="Edad mínima"><input inputMode="numeric" value={p.edadMin} onChange={(e) => set("edadMin", e.target.value)} /></Campo>
        <Campo etiqueta="Edad máxima"><input inputMode="numeric" value={p.edadMax} onChange={(e) => set("edadMax", e.target.value)} /></Campo>
        {(p.ramo === "vida" || p.ramo === "ppr" || p.ramo === "educacion") && <Campo etiqueta="Suma asegurada mínima"><input inputMode="numeric" value={p.sumaMin || ""} onChange={(e) => set("sumaMin", e.target.value)} /></Campo>}
        {p.ramo === "ppr" && <Campo etiqueta="Prima mínima anual"><input inputMode="numeric" value={p.primaMinAnual || ""} onChange={(e) => set("primaMinAnual", e.target.value)} /></Campo>}
        {p.ramo === "ppr" && <Campo etiqueta="Edad de retiro"><input inputMode="numeric" value={p.retiroEdad || 65} onChange={(e) => set("retiroEdad", e.target.value)} /></Campo>}
        {p.ramo === "ppr" && <Campo etiqueta="Artículos fiscales (ej. 151 y 185)"><input value={p.fiscal || ""} onChange={(e) => set("fiscal", e.target.value)} /></Campo>}
        {p.ramo === "educacion" && <Campo etiqueta="Edad máxima del hijo"><input inputMode="numeric" value={p.edadHijoMax || ""} onChange={(e) => set("edadHijoMax", e.target.value)} /></Campo>}
        {p.ramo === "gmm" && <>
          <Campo etiqueta="Sumas aseguradas (separadas por coma)" ancho={2}><textarea rows={2} value={p._sumas} onChange={(e) => set("_sumas", e.target.value)} /></Campo>
          <Campo etiqueta="Deducibles (coma)" ancho={2}><input value={p._deducibles} onChange={(e) => set("_deducibles", e.target.value)} /></Campo>
          <Campo etiqueta="Coaseguro % (coma)" ancho={2}><input value={p._coaseguros} onChange={(e) => set("_coaseguros", e.target.value)} /></Campo>
        </>}
        <Campo etiqueta="Plazos u opciones" ancho={2}><input value={p.plazos || ""} onChange={(e) => set("plazos", e.target.value)} /></Campo>
        <Campo etiqueta="Coberturas (una por línea)" ancho={2}><textarea rows={4} value={p._coberturas} onChange={(e) => set("_coberturas", e.target.value)} /></Campo>
        <Campo etiqueta="Notas, condiciones y exclusiones" ancho={2}><textarea rows={3} value={p.notas || ""} onChange={(e) => set("notas", e.target.value)} /></Campo>
      </div>
      <div className="dg-docs">
        <span className="dg-etq">Documentos del producto (folleto, CTP, condiciones, tarifas)</span>
        {(p.docs || []).map((d, i) => (
          <div key={d.path} className="dg-doc"><button className="dg-link" onClick={() => abrir(d)}><FileText size={14} /> {d.nombre}</button>
            <button className="dg-icono" onClick={() => set("docs", p.docs.filter((_, j) => j !== i))} aria-label="Quitar"><X size={14} /></button></div>
        ))}
        <label className="dg-btn dg-sec"><Upload size={15} /> {subiendo ? "Subiendo…" : "Subir PDF o Excel"}
          <input type="file" multiple accept=".pdf,.xlsx,.xls,.csv,image/*" hidden onChange={(e) => { subir([...e.target.files]); e.target.value = ""; }} /></label>
      </div>
      {err && <div className="dg-error">{err}</div>}
      <div className="dg-fila-fin"><button className="dg-btn dg-sec" onClick={onCerrar}>Cancelar</button><button className="dg-btn dg-oro" onClick={guardar}>Guardar producto</button></div>
    </div>
  );
}

export default function DiagnosticoCatalogo({ cat }) {
  const { catalogo, propios, error, guardarProducto, quitarProducto, restaurar, importar } = cat;
  const [editando, setEditando] = useState(null);
  const [abierto, setAbierto] = useState("");
  const [msg, setMsg] = useState("");
  const ocultos = propios.filter((p) => p.oculto);

  function exportar() {
    const blob = new Blob([JSON.stringify(catalogo.filter((p) => !p.oculto && !p.base).map((p) => { const r = { ...p }; delete r.base; return r; }), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "catalogo-productos.json"; a.click();
  }
  async function leerJson(file) {
    try {
      const data = JSON.parse(await file.text());
      const arr = (Array.isArray(data) ? data : [data]).filter((p) => p && p.nombre && p.ramo).map((p, i) => ({ ...p, id: p.id || `imp-${Date.now()}-${i}` }));
      if (!arr.length) throw new Error("vacío");
      await importar(arr); setMsg(`Se importaron ${arr.length} producto(s).`);
    } catch { setMsg("No se pudo leer el archivo. Debe ser un JSON con una lista de productos."); }
  }

  return (
    <div className="dg-seccion">
      <div className="dg-barra">
        <button className="dg-btn dg-oro" onClick={() => setEditando({})}><Plus size={16} /> Agregar producto</button>
        <label className="dg-btn dg-sec"><Upload size={15} /> Importar JSON<input type="file" accept=".json" hidden onChange={(e) => { if (e.target.files[0]) leerJson(e.target.files[0]); e.target.value = ""; }} /></label>
        <button className="dg-btn dg-sec" onClick={exportar}><Download size={15} /> Exportar mis productos</button>
      </div>
      <p className="dg-nota">Aquí se guarda la información de cada producto. Puedes agregar más aseguradoras o ramos en cualquier momento; el diagnóstico los usa en cuanto los guardas. Las primas no vienen en los folletos: se capturan en la cotización de cada propuesta.</p>
      {error && <div className="dg-error">{error}</div>}
      {msg && <div className="dg-ok">{msg}</div>}
      {editando && <Formulario inicial={editando} onCerrar={() => setEditando(null)} onGuardar={async (p) => { await guardarProducto(p); setEditando(null); }} />}
      {RAMOS.map((r) => {
        const items = catalogo.filter((p) => p.ramo === r.id && !p.oculto);
        return (
          <div key={r.id} className="dg-grupo">
            <h3>{r.label} <small>{items.length} producto{items.length === 1 ? "" : "s"}</small></h3>
            {items.map((p) => (
              <div key={p.id} className="dg-tarjeta">
                <button className="dg-tarjeta-cab" onClick={() => setAbierto(abierto === p.id ? "" : p.id)}>
                  <InsurerMark name={p.aseguradora} w={44} h={30} radius={8} />
                  <span className="dg-tarjeta-tit"><strong>{p.nombre}</strong><small>{p.aseguradora}{p.base ? "" : " · agregado por ti"}</small></span>
                  <ChevronDown size={18} style={{ transform: abierto === p.id ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {abierto === p.id && (
                  <div className="dg-tarjeta-cuerpo">
                    {p.descripcion && <p>{p.descripcion}</p>}
                    <ul className="dg-datos">
                      <li><b>Edades:</b> {p.edadMin ?? 0} a {p.edadMax ?? "sin límite"} años</li>
                      {p.sumaMin ? <li><b>Suma mínima:</b> {p.sumaEnUdi ? `${p.sumaMin.toLocaleString("es-MX")} UDI` : dinero(p.sumaMin)}</li> : null}
                      {p.primaMinAnual ? <li><b>Prima mínima:</b> {dinero(p.primaMinAnual)} al año</li> : null}
                      {p.plazos ? <li><b>Plazos:</b> {p.plazos}</li> : null}
                      {p.sumas?.length ? <li><b>Sumas aseguradas:</b> {p.sumas.map(dinero).join(" · ")}</li> : null}
                      {p.deducibles?.length ? <li><b>Deducibles:</b> {p.deducibles.map(dinero).join(" · ")}</li> : null}
                      {p.coaseguros?.length ? <li><b>Coaseguro:</b> {p.coaseguros.join("%, ")}%</li> : null}
                      {p.fondos?.length ? <li><b>Fondos:</b> {p.fondos.map((f) => `${f.nombre} ${Math.round(f.tasa * 100)}%`).join(" · ")}</li> : null}
                      {p.fiscal ? <li><b>Fiscal:</b> art. {p.fiscal} de la LISR</li> : null}
                    </ul>
                    {p.coberturas?.length ? <><span className="dg-etq">Coberturas</span><ul className="dg-lista">{p.coberturas.map((c) => <li key={c}>{c}</li>)}</ul></> : null}
                    {p.notas && <p className="dg-nota">{p.notas}</p>}
                    <div className="dg-fila-fin">
                      <button className="dg-btn dg-sec" onClick={() => { if (window.confirm(`¿Quitar "${p.nombre}" del catálogo?`)) quitarProducto(p); }}><Trash2 size={14} /> Quitar</button>
                      <button className="dg-btn dg-sec" onClick={() => setEditando(p)}>Editar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
      {ocultos.length > 0 && (
        <div className="dg-nota">Productos quitados: {ocultos.map((o) => <button key={o.id} className="dg-link" onClick={() => restaurar(o.id)}><RotateCcw size={12} /> {o.id}</button>)}</div>
      )}
    </div>
  );
}
