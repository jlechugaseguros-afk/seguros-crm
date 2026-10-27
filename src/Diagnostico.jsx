import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2, FileDown, Smartphone, FileText, Upload, X } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import PageHeader from "./PageHeader.jsx";
import { InsurerMark } from "./insurerLogos.jsx";
import DiagnosticoCatalogo from "./diagnostico/DiagnosticoCatalogo.jsx";
import { useCatalogo } from "./diagnostico/useCatalogo.js";
import { RAMOS } from "./diagnostico/catalogoBase.js";
import { diagnosticoCompleto, supuestosPorDefecto, recomendarProductos, recomendarGmm, efectoOpcion, dinero, millones, pct, num } from "./diagnostico/calculos.js";
import "./Diagnostico.css";

const KEY = "diag_casos";
const PASOS = ["Datos", "Metas", "Realidad", "Protección", "Panorama", "Propuesta", "Presentación"];
const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-60);
const DATOS_VACIOS = { nombre: "", edad: "", sexo: "", fumador: "no", pareja: "no", dependientes: "", hijos: [], edadRetiro: 65, ingresoRetiro: "", otroIngresoRetiro: "", ingreso: "", gastos: "", ahorro: "", afore: "", deudas: "", aportacionRetiro: "", vidaVigente: "", gmmTiene: "no", gmmSuma: "", metaRetiro: true };
const nuevoCaso = () => ({ id: `d-${Date.now()}`, nombre: "", prospectoId: "", clienteId: "", creado: new Date().toISOString(), paso: 0, datos: { ...DATOS_VACIOS }, supuestos: null, propuesta: { ppr: [], vida: [], educacion: [], gmm: [] } });

function Num({ valor, onCambio, prefijo = "$", ...r }) {
  return (
    <span className="dg-num">{prefijo && <i>{prefijo}</i>}
      <input inputMode="decimal" value={valor === 0 || valor ? valor : ""} onChange={(e) => onCambio(e.target.value.replace(/[^\d.]/g, ""))} {...r} /></span>
  );
}
function Fila({ etiqueta, ayuda, children }) {
  return <label className="dg-fila"><span className="dg-fila-et">{etiqueta}{ayuda && <small>{ayuda}</small>}</span>{children}</label>;
}
function Barra({ valor, oro }) {
  return <div className="dg-barra-pct"><div className={oro ? "oro" : ""} style={{ width: `${Math.max(2, Math.min(100, valor * 100))}%` }} /></div>;
}

// ------------------------------------------------------------------ pasos
function PasoDatos({ d, set, prospectos, clients, caso, setCaso }) {
  return (
    <>
      <h3 className="dg-h">¿De quién es el diagnóstico?</h3>
      <div className="dg-bloque">
        <Fila etiqueta="Vincular a un prospecto">
          <select value={caso.prospectoId} onChange={(e) => { const p = prospectos.find((x) => String(x.id) === e.target.value); setCaso({ ...caso, prospectoId: e.target.value, clienteId: "", nombre: p ? p.nombre || "" : caso.nombre, datos: { ...d, nombre: p ? p.nombre || "" : d.nombre } }); }}>
            <option value="">Ninguno</option>{prospectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
        </Fila>
        <Fila etiqueta="o a un cliente">
          <select value={caso.clienteId} onChange={(e) => { const c = clients.find((x) => String(x.id) === e.target.value); const nom = c ? [c.nombre, c.apellido].filter(Boolean).join(" ") : caso.nombre; setCaso({ ...caso, clienteId: e.target.value, prospectoId: "", nombre: nom, datos: { ...d, nombre: nom } }); }}>
            <option value="">Ninguno</option>{clients.map((c) => <option key={c.id} value={c.id}>{[c.nombre, c.apellido].filter(Boolean).join(" ")}</option>)}</select>
        </Fila>
        <Fila etiqueta="Nombre"><input value={d.nombre} onChange={(e) => { set("nombre", e.target.value); setCaso((c) => ({ ...c, nombre: e.target.value })); }} /></Fila>
        <Fila etiqueta="Edad"><input inputMode="numeric" value={d.edad} onChange={(e) => set("edad", e.target.value.replace(/\D/g, ""))} /></Fila>
        <Fila etiqueta="Sexo"><select value={d.sexo} onChange={(e) => set("sexo", e.target.value)}><option value="">—</option><option value="h">Hombre</option><option value="m">Mujer</option></select></Fila>
        <Fila etiqueta="¿Fuma?"><select value={d.fumador} onChange={(e) => set("fumador", e.target.value)}><option value="no">No</option><option value="si">Sí</option></select></Fila>
        <Fila etiqueta="¿Tiene pareja?"><select value={d.pareja} onChange={(e) => set("pareja", e.target.value)}><option value="no">No</option><option value="si">Sí</option></select></Fila>
        <Fila etiqueta="Dependientes económicos"><input inputMode="numeric" value={d.dependientes} onChange={(e) => set("dependientes", e.target.value.replace(/\D/g, ""))} /></Fila>
      </div>
    </>
  );
}

function PasoMetas({ d, set }) {
  const hijos = d.hijos || [];
  const setHijo = (i, k, v) => set("hijos", hijos.map((h, j) => (j === i ? { ...h, [k]: v } : h)));
  return (
    <>
      <h3 className="dg-h">¿A dónde quiere llegar?</h3>
      <div className="dg-bloque">
        <Fila etiqueta="Meta de retiro"><select value={d.metaRetiro ? "si" : "no"} onChange={(e) => set("metaRetiro", e.target.value === "si")}><option value="si">Sí, planear su retiro</option><option value="no">Por ahora no</option></select></Fila>
        {d.metaRetiro && <>
          <Fila etiqueta="Edad de retiro"><input inputMode="numeric" value={d.edadRetiro} onChange={(e) => set("edadRetiro", e.target.value.replace(/\D/g, ""))} /></Fila>
          <Fila etiqueta="Ingreso mensual deseado" ayuda="en pesos de hoy"><Num valor={d.ingresoRetiro} onCambio={(v) => set("ingresoRetiro", v)} /></Fila>
          <Fila etiqueta="Ya recibirá (pensión IMSS, renta…)" ayuda="mensual, pesos de hoy"><Num valor={d.otroIngresoRetiro} onCambio={(v) => set("otroIngresoRetiro", v)} /></Fila>
        </>}
      </div>
      <h3 className="dg-h">Educación de los hijos</h3>
      <div className="dg-bloque">
        {hijos.map((h, i) => (
          <div key={i} className="dg-hijo">
            <input placeholder="Nombre" value={h.nombre || ""} onChange={(e) => setHijo(i, "nombre", e.target.value)} />
            <input placeholder="Edad" inputMode="numeric" value={h.edad ?? ""} onChange={(e) => setHijo(i, "edad", e.target.value.replace(/\D/g, ""))} />
            <Num valor={h.ahorrado} onCambio={(v) => setHijo(i, "ahorrado", v)} placeholder="Ya ahorrado" />
            <button className="dg-icono" onClick={() => set("hijos", hijos.filter((_, j) => j !== i))} aria-label="Quitar"><X size={16} /></button>
          </div>
        ))}
        <button className="dg-btn dg-sec" onClick={() => set("hijos", [...hijos, { nombre: "", edad: "", ahorrado: "" }])}><Plus size={15} /> Agregar hijo</button>
      </div>
    </>
  );
}

function PasoRealidad({ d, set }) {
  const resta = num(d.ingreso) - num(d.gastos);
  return (
    <>
      <h3 className="dg-h">Su realidad de hoy</h3>
      <div className="dg-bloque">
        <Fila etiqueta="Ingreso mensual"><Num valor={d.ingreso} onCambio={(v) => set("ingreso", v)} /></Fila>
        <Fila etiqueta="Gastos mensuales"><Num valor={d.gastos} onCambio={(v) => set("gastos", v)} /></Fila>
        <Fila etiqueta="Ahorro e inversiones"><Num valor={d.ahorro} onCambio={(v) => set("ahorro", v)} /></Fila>
        <Fila etiqueta="Saldo de AFORE"><Num valor={d.afore} onCambio={(v) => set("afore", v)} /></Fila>
        <Fila etiqueta="Deudas (hipoteca, créditos)"><Num valor={d.deudas} onCambio={(v) => set("deudas", v)} /></Fila>
        <Fila etiqueta="Ya aporta al retiro cada mes"><Num valor={d.aportacionRetiro} onCambio={(v) => set("aportacionRetiro", v)} /></Fila>
      </div>
      {d.ingreso && d.gastos ? <div className="dg-pista"><strong>{resta >= 0 ? `Hoy le quedan ${dinero(resta)} al mes` : `Hoy gasta ${dinero(-resta)} más de lo que gana`}</strong><span>Ese es el punto de partida para construir el plan.</span></div> : null}
    </>
  );
}

function PasoProteccion({ d, set }) {
  return (
    <>
      <h3 className="dg-h">Protección que ya tiene</h3>
      <div className="dg-bloque">
        <Fila etiqueta="Seguro de vida vigente" ayuda="suma asegurada total"><Num valor={d.vidaVigente} onCambio={(v) => set("vidaVigente", v)} /></Fila>
        <Fila etiqueta="¿Tiene seguro de gastos médicos privado?"><select value={d.gmmTiene} onChange={(e) => set("gmmTiene", e.target.value)}><option value="no">No</option><option value="si">Sí</option></select></Fila>
        {d.gmmTiene === "si" && <Fila etiqueta="Suma asegurada actual"><Num valor={d.gmmSuma} onCambio={(v) => set("gmmSuma", v)} /></Fila>}
      </div>
    </>
  );
}

function Supuestos({ s, setS }) {
  const campos = [
    ["inflacion", "Inflación anual", true], ["rendimiento", "Rendimiento anual del ahorro", true], ["tasaRealRetiro", "Rendimiento real en el retiro", true],
    ["aniosRetiro", "Años de ingreso en el retiro", false], ["aniosSosten", "Años de sostén familiar (vida)", false], ["gastosFinales", "Gastos finales", false],
    ["costoEvento", "Costo de un evento médico mayor", false], ["costoCarreraHoy", "Costo de la carrera hoy", false], ["inflacionEducacion", "Inflación educativa", true],
    ["tasaMarginalISR", "Tasa marginal de ISR", true], ["umaDiaria", "UMA diaria vigente", false], ["valorUDI", "Valor de la UDI", false],
  ];
  return (
    <details className="dg-supuestos">
      <summary>Editar supuestos</summary>
      <div className="dg-bloque">
        {campos.map(([k, et, esPct]) => (
          <Fila key={k} etiqueta={et}>
            <span className="dg-num">{esPct ? <i>%</i> : null}
              <input inputMode="decimal" value={esPct ? +(s[k] * 100).toFixed(2) : s[k]} onChange={(e) => { const v = parseFloat(e.target.value.replace(/[^\d.]/g, "")); setS({ ...s, [k]: Number.isFinite(v) ? (esPct ? v / 100 : v) : 0 }); }} /></span>
          </Fila>
        ))}
        <p className="dg-nota">La UMA 2026 es $117.31 diarios (desde el 1 de febrero). Verifica el valor de la UDI en Banxico. Son proyecciones, no garantías.</p>
      </div>
    </details>
  );
}

function TarjetaObjetivo({ titulo, cubierto, brecha, detalle, extra }) {
  return (
    <div className="dg-obj">
      <div className="dg-obj-cab"><strong>{titulo}</strong><span className="dg-chip">{brecha > 0 ? `Brecha ${millones(brecha)}` : "Cubierto"}</span></div>
      {detalle && <p>{detalle}</p>}
      <Barra valor={cubierto} /><small>Hoy cubre el {pct(cubierto)}</small>
      {extra}
    </div>
  );
}

function PasoPanorama({ d, s, setS, diag }) {
  const r = diag.retiro, p = diag.proteccion, e = diag.educacion, h = diag.salud;
  return (
    <>
      <h3 className="dg-h">Panorama completo</h3>
      <p className="dg-sub">Esto es lo que falta para llegar a sus metas.</p>
      {r && <TarjetaObjetivo titulo="Retiro" cubierto={r.cubierto} brecha={r.brecha}
        detalle={`Vivir con ${dinero(d.ingresoRetiro)} al mes a los ${d.edadRetiro || 65} años, en pesos de hoy.`}
        extra={<div className="dg-cifras"><div><small>Capital necesario</small><b>{millones(r.capRequerido)}</b></div><div><small>Llegaría con</small><b>{millones(r.capProyectado)}</b></div><div><small>Aportar al mes</small><b>{dinero(r.aportacionNecesaria)}</b></div>
          <p className="dg-nota" style={{ gridColumn: "1 / -1" }}>{millones(r.capRequerido)} en {r.aniosAcum} años equivalen a {millones(r.capRequeridoHoy)} de hoy. Si aporta {dinero(r.aportacionNecesaria)} al mes puede deducir hasta {dinero(r.fiscal.deducible)} al año y ahorrar cerca de {dinero(r.fiscal.ahorroISR)} de ISR.</p></div>} />}
      <TarjetaObjetivo titulo="Protección de la familia" cubierto={p.cubierto} brecha={p.brecha}
        detalle={p.tieneFamilia ? `Para sostener a su familia ${s.aniosSosten} años, pagar deudas y gastos finales se necesitan ${millones(p.necesidad)}. Tiene ${millones(p.vigente)}.` : `Cubrir deudas y gastos finales requiere ${millones(p.necesidad)}. Tiene ${millones(p.vigente)}.`} />
      {e && e.hijos.map((x, i) => <TarjetaObjetivo key={i} titulo={`Educación de ${x.nombre}`} cubierto={1 - x.brecha / (x.costoNominal || 1)} brecha={x.brecha}
        detalle={`La carrera costará cerca de ${millones(x.costoNominal)} en ${x.anios} años. Ahorro necesario: ${dinero(x.aportacion)} al mes.`} />)}
      <TarjetaObjetivo titulo="Salud" cubierto={h.cubierto} brecha={h.brecha}
        detalle={h.tiene ? `Un evento mayor cuesta cerca de ${millones(h.evento)}; su suma actual es ${millones(h.vigente)}.` : `Sin cobertura privada. Un evento mayor podría costar cerca de ${millones(h.evento)}.`} />
      <Supuestos s={s} setS={setS} />
    </>
  );
}

// -------- Propuesta
function OpcionPropuesta({ ramo, opt, i, diag, s, catalogo, recs, onCambio, onQuitar }) {
  const p = catalogo.find((x) => x.id === opt.productoId);
  const ef = p ? efectoOpcion(ramo, { ...opt, enUdi: p.sumaEnUdi }, diag, s) : null;
  const esAporte = ramo === "ppr";
  const rec = recs.find((x) => x.producto.id === opt.productoId);
  const [subiendo, setSubiendo] = useState(false);

  async function subir(files) {
    setSubiendo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const docs = [...(opt.docs || [])];
      for (const f of files) {
        const path = `diagnostico/${user.id}/cotizaciones/${Date.now()}-${docs.length}-${slug(f.name)}`;
        const { error } = await supabase.storage.from("documentos").upload(path, f, { upsert: true });
        if (error) throw error;
        docs.push({ nombre: f.name, path });
      }
      onCambio({ docs });
    } catch { window.alert("No se pudo subir el archivo."); }
    setSubiendo(false);
  }
  async function abrir(doc) { const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.path, 300); if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener"); }

  function elegir(id) {
    const prod = catalogo.find((x) => x.id === id);
    const cambios = { productoId: id };
    if (prod && ramo === "gmm") { const r = recomendarGmm(prod, diag); Object.assign(cambios, { monto: r.sumaRec || "", deducible: r.deducibleRec || "", coaseguro: r.coaseguroRec || "" }); }
    if (prod && ramo === "vida") Object.assign(cambios, { monto: Math.round(diag.proteccion.brecha / 100000) * 100000 || "", plazo: diag.proteccion.plazoSugerido });
    if (prod && ramo === "ppr") Object.assign(cambios, { monto: Math.round(diag.retiro?.aportacionNecesaria || 0) || "", prima: Math.round(diag.retiro?.aportacionNecesaria || 0) || "", frecuencia: "mensual" });
    if (prod && ramo === "educacion") Object.assign(cambios, { monto: prod.sumaEnUdi ? Math.min(prod.sumaMax || 1e9, Math.round(diag.educacion.brecha / s.valorUDI / 1000) * 1000) : Math.round(diag.educacion.brecha) });
    onCambio(cambios);
  }

  return (
    <div className="dg-opcion">
      <div className="dg-opcion-cab">
        {p ? <InsurerMark name={p.aseguradora} w={40} h={28} radius={7} /> : <span className="dg-letra">{String.fromCharCode(65 + i)}</span>}
        <select value={opt.productoId || ""} onChange={(e) => elegir(e.target.value)}>
          <option value="">Elegir producto del catálogo…</option>
          {recs.map((r) => <option key={r.producto.id} value={r.producto.id}>{r.ok ? "" : "⚠ "}{r.producto.aseguradora} · {r.producto.nombre}</option>)}
        </select>
        <button className="dg-icono" onClick={onQuitar} aria-label="Quitar opción"><Trash2 size={16} /></button>
      </div>
      {rec && (rec.motivos.length > 0 || rec.avisos.length > 0) && (
        <ul className="dg-razones">{rec.motivos.map((m) => <li key={m} className="ok">{m}</li>)}{rec.avisos.map((m) => <li key={m} className="aviso">{m}</li>)}</ul>
      )}
      {p && (
        <div className="dg-bloque">
          <Fila etiqueta={esAporte ? "Aportación mensual" : p?.sumaEnUdi ? "Suma asegurada (UDI)" : "Suma asegurada"}><Num prefijo={p?.sumaEnUdi ? "" : "$"} valor={opt.monto} onCambio={(v) => onCambio({ monto: v, ...(ramo === "ppr" && (opt.frecuencia || "mensual") === "mensual" ? { prima: v } : {}) })} /></Fila>
          {ramo === "gmm" && p.deducibles?.length > 0 && <Fila etiqueta="Deducible"><select value={opt.deducible || ""} onChange={(e) => onCambio({ deducible: Number(e.target.value) })}>{p.deducibles.map((x) => <option key={x} value={x}>{dinero(x)}</option>)}</select></Fila>}
          {ramo === "gmm" && p.coaseguros?.length > 0 && <Fila etiqueta="Coaseguro"><select value={opt.coaseguro || ""} onChange={(e) => onCambio({ coaseguro: Number(e.target.value) })}>{p.coaseguros.map((x) => <option key={x} value={x}>{x}%</option>)}</select></Fila>}
          {ramo === "vida" && <Fila etiqueta="Plazo (años)"><input inputMode="numeric" value={opt.plazo || ""} onChange={(e) => onCambio({ plazo: e.target.value.replace(/\D/g, "") })} /></Fila>}
          <Fila etiqueta="Prima de la cotización" ayuda="del PDF o cotizador"><Num valor={opt.prima} onCambio={(v) => onCambio({ prima: v })} /></Fila>
          <Fila etiqueta="Forma de pago"><select value={opt.frecuencia || "mensual"} onChange={(e) => onCambio({ frecuencia: e.target.value })}><option value="mensual">Mensual</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></Fila>
          <div className="dg-docs">
            {(opt.docs || []).map((doc, k) => <div key={doc.path} className="dg-doc"><button className="dg-link" onClick={() => abrir(doc)}><FileText size={14} /> {doc.nombre}</button><button className="dg-icono" onClick={() => onCambio({ docs: opt.docs.filter((_, j) => j !== k) })} aria-label="Quitar"><X size={14} /></button></div>)}
            <label className="dg-btn dg-sec"><Upload size={15} /> {subiendo ? "Subiendo…" : "Adjuntar cotización (PDF)"}<input type="file" multiple accept=".pdf,image/*" hidden onChange={(e) => { subir([...e.target.files]); e.target.value = ""; }} /></label>
          </div>
        </div>
      )}
      {ef && p && (
        <div className="dg-efecto"><Barra valor={ef.despues} oro /><small>Cubre el {pct(ef.pctBrecha)} de la brecha · pasa de {pct(ef.antes)} a {pct(ef.despues)}{ramo === "ppr" && diag.retiro ? ` · ingreso en el retiro ≈ ${dinero(ef.ingresoLogrado)} al mes de hoy` : ""}</small></div>
      )}
    </div>
  );
}

function PasoPropuesta({ caso, setCaso, diag, s, catalogo }) {
  const ramosActivos = [
    diag.retiro && { id: "ppr", brecha: diag.retiro.brecha },
    { id: "vida", brecha: diag.proteccion.brecha },
    diag.educacion && { id: "educacion", brecha: diag.educacion.brecha },
    { id: "gmm", brecha: diag.salud.brecha },
  ].filter(Boolean);
  const [ramo, setRamo] = useState(ramosActivos[0].id);
  const actual = ramosActivos.find((r) => r.id === ramo) ? ramo : ramosActivos[0].id;
  const recs = useMemo(() => recomendarProductos(actual, caso.datos, diag, s, catalogo), [actual, caso.datos, diag, s, catalogo]);
  const opts = caso.propuesta[actual] || [];
  const setOpts = (arr) => setCaso((c) => ({ ...c, propuesta: { ...c.propuesta, [actual]: arr } }));
  return (
    <>
      <h3 className="dg-h">Propuesta · 2ª entrevista</h3>
      <div className="dg-seg" role="tablist">
        {ramosActivos.map((r) => <button key={r.id} role="tab" aria-selected={r.id === actual} className={r.id === actual ? "on" : ""} onClick={() => setRamo(r.id)}>{RAMOS.find((x) => x.id === r.id).label.replace(" (PPR)", "")}</button>)}
      </div>
      {opts.map((o, i) => <OpcionPropuesta key={o.id} ramo={actual} opt={o} i={i} diag={diag} s={s} catalogo={catalogo} recs={recs}
        onCambio={(ch) => setOpts(opts.map((x) => (x.id === o.id ? { ...x, ...ch } : x)))} onQuitar={() => setOpts(opts.filter((x) => x.id !== o.id))} />)}
      {opts.length < 3 && <button className="dg-agregar" onClick={() => setOpts([...opts, { id: `o-${Date.now()}`, productoId: "", monto: "", prima: "", frecuencia: "mensual", docs: [] }])}><Plus size={16} /> Agregar opción</button>}
      {recs.length === 0 && <p className="dg-nota">No hay productos de este ramo en el catálogo. Agrégalos en la pestaña Catálogo.</p>}
    </>
  );
}

function PasoPresentacion({ caso, diag, s, catalogo, agente }) {
  const [formato, setFormato] = useState("movil");
  const [generando, setGenerando] = useState(false);
  const hay = Object.values(caso.propuesta).some((a) => a.some((o) => o.productoId));
  async function generar() {
    setGenerando(true);
    try {
      const { generarPresentacion } = await import("./diagnostico/presentacionPdf.js");
      await generarPresentacion({ caso, supuestos: s, diag, propuesta: caso.propuesta, catalogo, agente, formato });
    } catch (e) { window.alert("No se pudo generar el PDF: " + (e.message || e)); }
    setGenerando(false);
  }
  return (
    <>
      <h3 className="dg-h">Presentación para el cliente</h3>
      <p className="dg-sub">Muestra dónde está hoy, a dónde quiere llegar y cómo la propuesta cierra la brecha.</p>
      <div className="dg-seg"><button className={formato === "movil" ? "on" : ""} onClick={() => setFormato("movil")}><Smartphone size={14} /> Móvil</button><button className={formato === "a4" ? "on" : ""} onClick={() => setFormato("a4")}><FileText size={14} /> A4</button></div>
      {!hay && <div className="dg-error">Aún no hay productos en la propuesta. Elige al menos uno en el paso anterior.</div>}
      <button className="dg-btn dg-oro dg-grande" disabled={!hay || generando} onClick={generar}><FileDown size={18} /> {generando ? "Generando…" : "Descargar PDF"}</button>
      <p className="dg-nota">Al terminar, súbelo a Prospectos (estado "Cotización enviada") o envíalo por WhatsApp.</p>
    </>
  );
}

// ------------------------------------------------------------------ módulo
export default function Diagnostico({ clients = [], prospectos = [], agente = "" }) {
  const [vista, setVista] = useState("casos"); // casos | catalogo
  const [casos, setCasos] = useState(null);
  const [abierto, setAbierto] = useState(null); // id del caso
  const [err, setErr] = useState("");
  const cat = useCatalogo();
  const guardando = useRef(null);

  useEffect(() => { (async () => { try { const r = await window.storage.get(KEY); setCasos(r && r.value ? JSON.parse(r.value) : []); } catch { setCasos([]); } })(); }, []);

  function persistir(lista) {
    setCasos(lista);
    clearTimeout(guardando.current);
    guardando.current = setTimeout(async () => { try { await window.storage.set(KEY, JSON.stringify(lista)); setErr(""); } catch { setErr("No se pudo guardar. Revisa tu conexión."); } }, 500);
  }
  const caso = casos?.find((c) => c.id === abierto);
  const setCaso = (fn) => persistir(casos.map((c) => (c.id === abierto ? (typeof fn === "function" ? fn(c) : fn) : c)));

  const s = useMemo(() => (caso ? (caso.supuestos || supuestosPorDefecto(num(caso.datos.edad) || 35)) : null), [caso]);
  const catalogoActivo = useMemo(() => cat.catalogo.filter((p) => !p.oculto), [cat.catalogo]);
  const diag = useMemo(() => (caso ? diagnosticoCompleto(caso.datos, s) : null), [caso, s]);
  if (casos === null) return <div className="dg-cargando">Cargando…</div>;

  if (caso) {
    const d = caso.datos;
    const set = (k, v) => setCaso((c) => ({ ...c, datos: { ...c.datos, [k]: v } }));
    const setS = (nuevo) => setCaso((c) => ({ ...c, supuestos: nuevo }));
    const paso = caso.paso || 0;
    const ir = (n) => { setCaso((c) => ({ ...c, paso: n })); window.scrollTo({ top: 0, behavior: "smooth" }); };
    const falta = paso >= 4 && (!num(d.edad) || !num(d.ingreso));
    return (
      <div className="dg-wrap">
        <PageHeader eyebrow="Herramientas" title="Diagnóstico y propuesta" subtitle={caso.nombre || "Nuevo diagnóstico"} />
        <button className="dg-volver" onClick={() => setAbierto(null)}><ChevronLeft size={16} /> Todos los diagnósticos</button>
        <ol className="dg-pasos">{PASOS.map((p, i) => <li key={p} className={i === paso ? "act" : i < paso ? "hecho" : ""}><button onClick={() => ir(i)} aria-label={`Paso ${i + 1}: ${p}`}>{i + 1}</button></li>)}</ol>
        <div className="dg-etiqueta-paso">Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}</div>
        <div className="dg-contenido">
          {paso === 0 && <PasoDatos d={d} set={set} prospectos={prospectos} clients={clients} caso={caso} setCaso={setCaso} />}
          {paso === 1 && <PasoMetas d={d} set={set} />}
          {paso === 2 && <PasoRealidad d={d} set={set} />}
          {paso === 3 && <PasoProteccion d={d} set={set} />}
          {paso >= 4 && falta && <div className="dg-error">Falta la edad y el ingreso mensual (pasos 1 y 3) para calcular el diagnóstico.</div>}
          {paso === 4 && !falta && <PasoPanorama d={d} s={s} setS={setS} diag={diag} />}
          {paso === 5 && !falta && <PasoPropuesta caso={caso} setCaso={setCaso} diag={diag} s={s} catalogo={catalogoActivo} />}
          {paso === 6 && !falta && <PasoPresentacion caso={caso} diag={diag} s={s} catalogo={catalogoActivo} agente={agente} />}
        </div>
        {err && <div className="dg-error">{err}</div>}
        <div className="dg-nav">
          <button className="dg-btn dg-sec" disabled={paso === 0} onClick={() => ir(paso - 1)}><ChevronLeft size={16} /> Atrás</button>
          {paso < PASOS.length - 1 ? <button className="dg-btn dg-oro" onClick={() => ir(paso + 1)}>{paso === 3 ? "Ver panorama" : paso === 4 ? "Preparar propuesta" : "Continuar"} <ChevronRight size={16} /></button> : <button className="dg-btn dg-oro" onClick={() => setAbierto(null)}>Terminar</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="dg-wrap">
      <PageHeader eyebrow="Herramientas" title="Diagnóstico y propuesta" subtitle="Dónde está tu cliente y cómo llegar a sus metas"
        action={vista === "casos" ? <button className="dg-btn dg-oro" onClick={() => { const c = nuevoCaso(); persistir([c, ...casos]); setAbierto(c.id); }}><Plus size={16} /> Nuevo diagnóstico</button> : null} />
      <div className="dg-seg dg-seg-top"><button className={vista === "casos" ? "on" : ""} onClick={() => setVista("casos")}>Diagnósticos</button><button className={vista === "catalogo" ? "on" : ""} onClick={() => setVista("catalogo")}>Catálogo de productos</button></div>
      {err && <div className="dg-error">{err}</div>}
      {vista === "catalogo" ? <DiagnosticoCatalogo cat={cat} /> : (
        <div className="dg-seccion">
          {casos.length === 0 && <div className="dg-vacio"><strong>Aún no hay diagnósticos</strong><p>En la primera entrevista capturas la situación del cliente y el sistema calcula dónde está y cuánto le falta en retiro, protección, educación y salud. En la segunda eliges productos del catálogo y generas la presentación.</p></div>}
          {casos.map((c) => {
            const dg = diagnosticoCompleto(c.datos, c.supuestos || supuestosPorDefecto(num(c.datos.edad) || 35));
            const listo = num(c.datos.edad) && num(c.datos.ingreso);
            return (
              <div key={c.id} className="dg-caso">
                <button className="dg-caso-cuerpo" onClick={() => setAbierto(c.id)}>
                  <strong>{c.nombre || "Sin nombre"}</strong>
                  <small>{new Date(c.creado).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })} · paso {(c.paso || 0) + 1} de {PASOS.length}{listo && dg.retiro ? ` · retiro cubierto ${pct(dg.retiro.cubierto)}` : ""}</small>
                </button>
                <button className="dg-icono" aria-label="Eliminar" onClick={() => { if (window.confirm("¿Eliminar este diagnóstico?")) persistir(casos.filter((x) => x.id !== c.id)); }}><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
