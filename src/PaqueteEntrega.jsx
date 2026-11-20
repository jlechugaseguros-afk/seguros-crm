import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, FileText, Mail, MessageCircle, Pencil, Share2, Trash2, Upload } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "./supabaseClient.js";
import { INSURER_LOGOS } from "./insurerLogoAssets.js";
import { insurerKey } from "./insurerLogos.jsx";
import { reducirImagen } from "./TarjetaMC.jsx";
import { generarCartaPdf, fechaLarga, hoyDdMmAaaa, nombreParaCarta } from "./cartaBienvenida.js";
import decorUrl from "./carta/decor.jpg";
import logoBanorteUrl from "./carta/logo-banorte-seguros.png";
import logoJoshuaUrl from "./carta/logo-joshua.png";
import qrJoshuaUrl from "./diagPat/qr.png";

// Pestaña "Paquete de entrega" de cada cliente: arma sola un PDF con la carta de bienvenida (editable),
// la póliza y las condiciones generales, y lo comparte por WhatsApp. Todo se genera en el dispositivo.

const BUCKET = "documentos";
const CFG_KEY = "carta_bienvenida"; // por agente: { logoAgente, qr, logosAseg: { <clave>: dataUrl } }
const PERFIL_KEY = "dpat_perfil"; // lo usa el Diagnóstico patrimonial (logo y QR del asesor)
const JOSHUA_CORREO = "jlechuga.seguros@gmail.com";
const NOMBRES_MASCULINOS_EN_A = ["joshua", "luca", "borja", "mustafa", "jeshua", "yeshua"];

const campo = { width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff", color: "var(--ink)", fontFamily: "inherit", boxSizing: "border-box" };
const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--stone)", margin: "10px 0 4px" };
const btn = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const btnPrim = { ...btn, background: "var(--ink)", color: "#fff", border: "none" };
const tarjeta = { background: "#FFFFFF", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px", marginBottom: 12, boxShadow: "var(--shadow)" };

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function mismaAseguradora(a, b) {
  const ka = insurerKey(a);
  const kb = insurerKey(b);
  if (ka || kb) return ka === kb;
  return norm(a) === norm(b);
}

function saludoSugerido(nombre) {
  const primero = norm(nombre).split(/\s+/)[0] || "";
  return primero.endsWith("a") && !NOMBRES_MASCULINOS_EN_A.includes(primero) ? "Estimada" : "Estimado";
}

function nombreArchivoSeguro(s) {
  return String(s || "").replace(/[\\/:*?"<>|%]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function tituloNombre(s) {
  return String(s || "").trim().toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());
}

function fmtTam(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const aDataUrl = (blob) =>
  new Promise((ok, no) => {
    const fr = new FileReader();
    fr.onload = () => ok(fr.result);
    fr.onerror = () => no(new Error("No se pudo leer la imagen."));
    fr.readAsDataURL(blob);
  });

// ---------- Imágenes para el PDF ----------
const cacheImg = new Map();
function cargarImg(src) {
  return new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error("No se pudo cargar una imagen."));
    i.src = src;
  });
}

// Deja la imagen lista para jsPDF: PNG o JPEG, con tamaño razonable y, si hace falta, un fondo de color.
async function normalizarImagen(src, { max = 1400, jpeg = false, fondo = "" } = {}) {
  if (!src) return null;
  const clave = `${jpeg ? "j" : "p"}|${fondo}|${max}|${src}`;
  if (cacheImg.has(clave)) return cacheImg.get(clave);
  const img = await cargarImg(src);
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (jpeg || fondo) {
    ctx.fillStyle = fondo || "#fff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  const res = { data: cv.toDataURL(jpeg ? "image/jpeg" : "image/png", 0.9), w, h, fmt: jpeg ? "JPEG" : "PNG" };
  cacheImg.set(clave, res);
  return res;
}

// ---------- PDF ----------
async function renderPrimeraPagina(bytes, ancho = 640) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: ancho / base.width });
  const cv = document.createElement("canvas");
  cv.width = Math.round(viewport.width);
  cv.height = Math.round(viewport.height);
  await page.render({ canvasContext: cv.getContext("2d"), canvas: cv, viewport }).promise;
  return cv.toDataURL("image/jpeg", 0.85);
}

// Foto de la póliza -> PDF de una página (para poder unirla con los demás).
async function imagenAPdf(bytes, tipo) {
  const blob = new Blob([bytes], { type: tipo || "image/jpeg" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await cargarImg(url);
    const cv = document.createElement("canvas");
    const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    cv.width = Math.round(img.naturalWidth * k);
    cv.height = Math.round(img.naturalHeight * k);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const jpg = await new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.88));
    const doc = await PDFDocument.create();
    const emb = await doc.embedJpg(await jpg.arrayBuffer());
    const esc = Math.min(792 / emb.height, 612 / emb.width, 1.2);
    const pw = emb.width * esc;
    const ph = emb.height * esc;
    const pag = doc.addPage([pw, ph]);
    pag.drawImage(emb, { x: 0, y: 0, width: pw, height: ph });
    return await doc.save();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function unirPdfs(partes) {
  const out = await PDFDocument.create();
  for (const p of partes) {
    const src = await PDFDocument.load(p.bytes, { ignoreEncryption: true });
    const pags = await out.copyPages(src, src.getPageIndices());
    pags.forEach((pg) => out.addPage(pg));
  }
  const bytes = await out.save();
  return { bytes, paginas: out.getPageCount() };
}

const cacheArchivos = new Map(); // path -> { bytes, tipo }
async function bajarArchivo(path) {
  if (cacheArchivos.has(path)) return cacheArchivos.get(path);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error("No se pudo descargar el archivo.");
  const res = { bytes: await data.arrayBuffer(), tipo: data.type || "" };
  cacheArchivos.set(path, res);
  return res;
}

const esImagenDoc = (nombre, tipo) => /^image\//.test(tipo || "") || /\.(jpe?g|png|webp|heic|heif)$/i.test(nombre || "");

// ---------- Ajustes por agente ----------
async function leerJson(key) {
  try {
    const r = await window.storage.get(key);
    return r && r.value ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}

function Fila({ marcado, onMarcar, titulo, detalle, aviso, deshabilitado, children }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <input type="checkbox" checked={marcado} disabled={deshabilitado} onChange={(e) => onMarcar(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} aria-label={titulo} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</div>
        {detalle && <div style={{ fontSize: 12, color: "var(--stone)", marginTop: 2, wordBreak: "break-word" }}>{detalle}</div>}
        {aviso && <div style={{ fontSize: 12, color: "#B23A2E", marginTop: 2 }}>{aviso}</div>}
        {children}
      </div>
    </div>
  );
}

function SelectorImagen({ titulo, ayuda, src, onElegir, onQuitar, vacio, caja = { w: 96, h: 56 } }) {
  const ref = useRef(null);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
      <div style={{ width: caja.w, height: caja.h, flexShrink: 0, border: "1px dashed var(--line)", borderRadius: 8, background: "#F4F7FA", display: "grid", placeItems: "center", overflow: "hidden" }}>
        {src ? <img src={src} alt={titulo} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 11, color: "var(--stone)", textAlign: "center", padding: 4 }}>{vacio}</span>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{titulo}</div>
        {ayuda && <div style={{ fontSize: 11, color: "var(--stone)", marginBottom: 4 }}>{ayuda}</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" style={{ ...btn, padding: "6px 10px", fontSize: 12 }} onClick={() => ref.current && ref.current.click()}>
            <Upload size={13} /> {src ? "Cambiar" : "Cargar"}
          </button>
          {onQuitar && (
            <button type="button" style={{ ...btn, padding: "6px 10px", fontSize: 12, color: "#B23A2E" }} onClick={onQuitar} aria-label={`Quitar ${titulo}`}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onElegir(f); }} />
      </div>
    </div>
  );
}

export default function PaqueteEntrega({ client, condiciones = [], agente = "", onActualizarPoliza }) {
  const polizas = useMemo(() => client.polizas || [], [client.polizas]);
  const [polizaId, setPolizaId] = useState(() => (polizas.find((p) => p.documento) || polizas[0] || {}).id || "");
  const poliza = polizas.find((p) => p.id === polizaId) || polizas[0] || null;
  useEffect(() => {
    if (polizas.length && !polizas.some((p) => p.id === polizaId)) setPolizaId(polizas[0].id);
  }, [polizas, polizaId]);

  // Ajustes del agente (logo, QR y logos de aseguradora que haya cambiado).
  const [cfg, setCfg] = useState(null);
  const [predet, setPredet] = useState({ logoAgente: "", qr: "" });
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [c, perfil, ses] = await Promise.all([
        leerJson(CFG_KEY),
        leerJson(PERFIL_KEY),
        supabase.auth.getUser().catch(() => null),
      ]);
      const correo = String(ses?.data?.user?.email || "").toLowerCase();
      const esJoshua = correo === JOSHUA_CORREO;
      if (!vivo) return;
      setCfg(c || {});
      setPredet({
        logoAgente: (perfil && perfil.logoUrl) || (esJoshua ? logoJoshuaUrl : ""),
        qr: (perfil && perfil.qrUrl) || (esJoshua ? qrJoshuaUrl : ""),
      });
    })();
    return () => { vivo = false; };
  }, []);

  const guardarCfg = useCallback(async (nuevo) => {
    setCfg(nuevo);
    try { await window.storage.set(CFG_KEY, JSON.stringify(nuevo)); } catch { /* se intentará en el siguiente cambio */ }
  }, []);

  // Datos de la carta (el borrador es local; se guarda en la póliza al salir del campo).
  const guardado = (poliza && poliza.cartaBienvenida) || {};
  const [borrador, setBorrador] = useState({});
  useEffect(() => { setBorrador({}); }, [polizaId]);
  const valor = (k, porDefecto) => (borrador[k] !== undefined ? borrador[k] : guardado[k] !== undefined ? guardado[k] : porDefecto);

  const saludo = valor("saludo", saludoSugerido(client.nombre));
  const asegurado = valor("asegurado", String(client.nombre || "").toUpperCase());
  const fecha = valor("fecha", hoyDdMmAaaa());
  const aseguradora = valor("aseguradora", nombreParaCarta(poliza ? poliza.aseguradora : ""));

  function confirmar(k, v) {
    if (!poliza) return;
    setBorrador((b) => { const n = { ...b }; delete n[k]; return n; });
    if (guardado[k] === v) return;
    onActualizarPoliza(poliza.id, { cartaBienvenida: { ...guardado, [k]: v } });
  }

  const claveLogo = poliza ? insurerKey(poliza.aseguradora) || "otra" : "otra";
  const logoPorDefecto = claveLogo === "banorte" ? { src: logoBanorteUrl, fondo: "" } : INSURER_LOGOS[claveLogo] ? { src: INSURER_LOGOS[claveLogo].src, fondo: INSURER_LOGOS[claveLogo].bg || "" } : null;
  const logoAsegPropio = cfg && cfg.logosAseg && cfg.logosAseg[claveLogo];
  const logoAsegSrc = logoAsegPropio || (logoPorDefecto && logoPorDefecto.src) || "";
  const logoAsegFondo = logoAsegPropio ? "" : (logoPorDefecto && logoPorDefecto.fondo) || "";
  const logoAgenteSrc = (cfg && cfg.logoAgente) || predet.logoAgente;
  const qrSrc = (cfg && cfg.qr) || predet.qr;

  const [errorImg, setErrorImg] = useState("");
  async function cambiarImagen(tipo, file) {
    try {
      const blob = await reducirImagen(file, 1200, "image/png", 0.9);
      const url = await aDataUrl(blob);
      const base = cfg || {};
      if (tipo === "logoAseg") await guardarCfg({ ...base, logosAseg: { ...(base.logosAseg || {}), [claveLogo]: url } });
      else await guardarCfg({ ...base, [tipo]: url });
    } catch (e) {
      setErrorImg(e.message || "No se pudo cargar la imagen.");
    }
  }
  function quitarImagen(tipo) {
    const base = cfg || {};
    if (tipo === "logoAseg") {
      const logos = { ...(base.logosAseg || {}) };
      delete logos[claveLogo];
      guardarCfg({ ...base, logosAseg: logos });
    } else {
      const n = { ...base };
      delete n[tipo];
      guardarCfg(n);
    }
  }

  // ---------- Carta (PDF + vista previa) ----------
  const [carta, setCarta] = useState(null); // { bytes, vista }
  const [errorCarta, setErrorCarta] = useState("");
  useEffect(() => {
    if (!poliza || cfg === null) return undefined;
    let cancelado = false;
    const t = setTimeout(async () => {
      try {
        const [decor, logoAseg, logoAgente, qr] = await Promise.all([
          normalizarImagen(decorUrl, { max: 1400, jpeg: true }),
          normalizarImagen(logoAsegSrc, { max: 1400, fondo: logoAsegFondo }),
          normalizarImagen(logoAgenteSrc, { max: 1200 }),
          normalizarImagen(qrSrc, { max: 900 }),
        ]);
        const bytes = generarCartaPdf({
          saludo, asegurado, fecha: fechaLarga(fecha), aseguradora, logoAseg, logoAgente, qr, decor,
        });
        const vista = await renderPrimeraPagina(bytes, 640);
        if (cancelado) return;
        setCarta({ bytes, vista });
        setErrorCarta("");
      } catch (e) {
        if (!cancelado) setErrorCarta(e.message || "No se pudo generar la carta.");
      }
    }, 450);
    return () => { cancelado = true; clearTimeout(t); };
  }, [poliza && poliza.id, cfg, saludo, asegurado, fecha, aseguradora, logoAsegSrc, logoAsegFondo, logoAgenteSrc, qrSrc]);

  // ---------- Condiciones generales que le tocan a esta póliza ----------
  const candidatos = useMemo(() => {
    if (!poliza) return [];
    const mismas = condiciones.filter((d) => mismaAseguradora(d.aseguradora, poliza.aseguradora));
    return [...mismas].sort((a, b) => Number(norm(b.ramo) === norm(poliza.ramo)) - Number(norm(a.ramo) === norm(poliza.ramo)));
  }, [condiciones, poliza]);
  const sugerido = useMemo(() => {
    const ok = candidatos.find((d) => norm(d.ramo) === norm(poliza ? poliza.ramo : ""));
    return ok ? [ok.id] : [];
  }, [candidatos, poliza]);
  const [cgElegidas, setCgElegidas] = useState(null); // null = automático
  useEffect(() => { setCgElegidas(null); }, [polizaId]);
  const cgIds = cgElegidas || sugerido;
  const cgDocs = cgIds.map((id) => condiciones.find((d) => d.id === id)).filter(Boolean);
  const [verOtras, setVerOtras] = useState(false);

  const [incluir, setIncluir] = useState({ carta: true, poliza: true, cg: true });
  const [modo, setModo] = useState("unico");
  const [editor, setEditor] = useState(true);

  // ---------- Armado del paquete ----------
  const [paquete, setPaquete] = useState(null);
  const [armando, setArmando] = useState(false);
  const docPoliza = poliza && poliza.documento && poliza.documento.path ? poliza.documento : null;
  const rutaCg = cgDocs.map((d) => d.path).join("|");

  useEffect(() => {
    if (!poliza || !carta) return undefined;
    let cancelado = false;
    (async () => {
      setArmando(true);
      const partes = [];
      const avisos = [];
      try {
        if (incluir.carta) partes.push({ nombre: "Carta de bienvenida.pdf", bytes: carta.bytes });
        if (incluir.poliza && docPoliza) {
          try {
            const a = await bajarArchivo(docPoliza.path);
            const nombre = `Póliza ${poliza.numeroPoliza || ""}`.trim() + ".pdf";
            partes.push({ nombre, bytes: esImagenDoc(docPoliza.name, a.tipo) ? await imagenAPdf(a.bytes, a.tipo) : a.bytes });
          } catch {
            avisos.push("No se pudo leer el archivo de la póliza.");
          }
        }
        if (incluir.cg) {
          for (const d of cgDocs) {
            try {
              const a = await bajarArchivo(d.path);
              partes.push({ nombre: d.name || "Condiciones generales.pdf", bytes: a.bytes });
            } catch {
              avisos.push(`No se pudieron leer las condiciones generales "${d.name}".`);
            }
          }
        }
        const legibles = [];
        for (const p of partes) {
          try {
            await PDFDocument.load(p.bytes, { ignoreEncryption: true });
            legibles.push(p);
          } catch {
            avisos.push(`"${p.nombre}" no se pudo unir al paquete (¿PDF protegido o dañado?).`);
          }
        }
        if (cancelado) return;
        if (legibles.length === 0) { setPaquete({ vacio: true, avisos }); return; }
        const { bytes, paginas } = await unirPdfs(legibles);
        if (cancelado) return;
        const base = nombreArchivoSeguro(`Paquete de bienvenida - ${client.nombre || "Cliente"} - ${poliza.aseguradora || ""}`);
        setPaquete({
          unico: new Blob([bytes], { type: "application/pdf" }),
          nombreUnico: `${base}.pdf`,
          archivos: legibles.map((p) => ({ nombre: nombreArchivoSeguro(p.nombre.replace(/\.pdf$/i, "")) + ".pdf", blob: new Blob([p.bytes], { type: "application/pdf" }) })),
          paginas,
          tam: bytes.byteLength,
          avisos,
        });
      } catch (e) {
        if (!cancelado) setPaquete({ vacio: true, avisos: [e.message || "No se pudo armar el paquete."] });
      } finally {
        if (!cancelado) setArmando(false);
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poliza && poliza.id, poliza && poliza.numeroPoliza, poliza && poliza.aseguradora, carta, incluir.carta, incluir.poliza, incluir.cg, docPoliza && docPoliza.path, rutaCg]);

  // ---------- Mensaje y envío ----------
  const contenido = [
    incluir.carta ? "tu carta de bienvenida" : null,
    incluir.poliza && docPoliza ? "tu póliza" : null,
    incluir.cg && cgDocs.length ? "las condiciones generales" : null,
  ].filter(Boolean);
  const lista = contenido.length > 1 ? `${contenido.slice(0, -1).join(", ")} y ${contenido[contenido.length - 1]}` : contenido[0] || "tu documentación";
  const primerNombre = tituloNombre(String(client.nombre || "").split(/\s+/)[0]);
  const mensajeBase = `Hola ${primerNombre}, te comparto tu paquete de bienvenida de tu póliza de ${poliza ? poliza.ramo : ""} con ${poliza ? poliza.aseguradora : ""}: incluye ${lista}. Quedo atento a cualquier duda.${agente ? `\n\nSaludos,\n${agente}` : ""}`;
  const [mensajeEditado, setMensajeEditado] = useState(null);
  useEffect(() => { setMensajeEditado(null); }, [polizaId]);
  const mensaje = mensajeEditado !== null ? mensajeEditado : mensajeBase;
  const [aviso, setAviso] = useState("");
  const digitos = String(client.telefono || "").replace(/\D/g, "");
  const tel = digitos.length === 10 ? `52${digitos}` : digitos;
  const linkChat = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}` : "";

  function archivosParaEnviar() {
    if (!paquete || paquete.vacio) return [];
    if (modo === "unico") return [new File([paquete.unico], paquete.nombreUnico, { type: "application/pdf" })];
    return paquete.archivos.map((a) => new File([a.blob], a.nombre, { type: "application/pdf" }));
  }

  async function enviarPorWhatsApp() {
    setAviso("");
    const files = archivosParaEnviar();
    if (!files.length) return;
    try {
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: paquete.nombreUnico, text: mensaje });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    // Este dispositivo no permite compartir archivos directo: se descarga y se abre el chat con el mensaje.
    files.forEach((f) => descargar(f, f.name));
    setAviso("Se descargó el paquete. Adjúntalo en el chat de WhatsApp que se abre.");
    if (linkChat) window.open(linkChat, "_blank", "noopener");
  }

  function descargarTodo() {
    archivosParaEnviar().forEach((f) => descargar(f, f.name));
  }

  async function copiarMensaje() {
    try {
      await navigator.clipboard.writeText(mensaje);
      setAviso("Mensaje copiado.");
    } catch {
      setAviso("No se pudo copiar; selecciona el texto y cópialo.");
    }
  }

  if (!poliza) {
    return (
      <p style={{ fontSize: 13, color: "var(--stone)" }}>
        Este cliente todavía no tiene pólizas. Agrega una en la pestaña "Pólizas" y aquí se armará su paquete de entrega.
      </p>
    );
  }

  const faltaPoliza = !docPoliza;
  const faltaCg = cgDocs.length === 0;
  const otras = condiciones.filter((d) => !candidatos.some((c) => c.id === d.id));

  return (
    <div>
      {polizas.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <label style={etiqueta}>Póliza del paquete</label>
          <select value={poliza.id} onChange={(e) => setPolizaId(e.target.value)} style={campo}>
            {polizas.map((p) => (
              <option key={p.id} value={p.id}>{`${p.aseguradora || "Sin aseguradora"} · ${p.ramo || "Sin ramo"}${p.numeroPoliza ? ` · ${p.numeroPoliza}` : ""}`}</option>
            ))}
          </select>
        </div>
      )}

      <div style={tarjeta}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Contenido del paquete</div>
        <div style={{ fontSize: 12, color: "var(--stone)" }}>Se arma solo con lo que ya está capturado. Quita la palomita a lo que no quieras enviar.</div>

        <Fila marcado={incluir.carta} onMarcar={(v) => setIncluir((i) => ({ ...i, carta: v }))} titulo="Carta de bienvenida" detalle="Se genera con los datos del cliente y de la póliza.">
          <button type="button" style={{ ...btn, marginTop: 8, padding: "6px 10px", fontSize: 12 }} onClick={() => setEditor((v) => !v)}>
            <Pencil size={13} /> {editor ? "Ocultar editor" : "Editar carta"}
          </button>
        </Fila>

        <Fila
          marcado={incluir.poliza && !faltaPoliza}
          deshabilitado={faltaPoliza}
          onMarcar={(v) => setIncluir((i) => ({ ...i, poliza: v }))}
          titulo="Póliza"
          detalle={docPoliza ? `${docPoliza.name}${poliza.numeroPoliza ? ` · Póliza ${poliza.numeroPoliza}` : ""}` : null}
          aviso={faltaPoliza ? 'Falta el archivo de la póliza. Súbelo en la pestaña "Pólizas" (botón "Subir archivo").' : ""}
        />

        <Fila
          marcado={incluir.cg && !faltaCg}
          deshabilitado={faltaCg}
          onMarcar={(v) => setIncluir((i) => ({ ...i, cg: v }))}
          titulo="Condiciones generales"
          detalle={cgDocs.length ? cgDocs.map((d) => d.name).join(" · ") : null}
          aviso={faltaCg ? `No encontré condiciones de ${poliza.aseguradora || "esta aseguradora"} para ${poliza.ramo || "este ramo"}. Elígelas abajo o súbelas en "Condiciones generales".` : ""}
        >
          <button type="button" style={{ ...btn, marginTop: 8, padding: "6px 10px", fontSize: 12 }} onClick={() => setVerOtras((v) => !v)}>
            <FileText size={13} /> {verOtras ? "Ocultar lista" : "Elegir otras"}
          </button>
          {verOtras && (
            <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: "4px 10px" }}>
              {[...candidatos, ...otras].length === 0 && <div style={{ fontSize: 12, color: "var(--stone)", padding: "6px 0" }}>Aún no hay condiciones generales en la biblioteca.</div>}
              {[...candidatos, ...otras].map((d) => (
                <label key={d.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", fontSize: 12, borderBottom: "1px solid var(--line)" }}>
                  <input
                    type="checkbox"
                    checked={cgIds.includes(d.id)}
                    onChange={(e) => setCgElegidas(e.target.checked ? [...cgIds, d.id] : cgIds.filter((x) => x !== d.id))}
                    style={{ width: 16, height: 16, marginTop: 1 }}
                  />
                  <span><b>{d.aseguradora || "—"}</b> · {d.ramo || "—"}<br /><span style={{ color: "var(--stone)" }}>{d.name}</span></span>
                </label>
              ))}
            </div>
          )}
        </Fila>
      </div>

      {editor && (
        <div style={tarjeta}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Editar carta de bienvenida</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <label style={{ ...etiqueta, marginTop: 0 }}>Saludo y nombre del asegurado</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={saludo} onChange={(e) => confirmar("saludo", e.target.value)} style={{ ...campo, width: 120, flexShrink: 0 }}>
                  <option>Estimada</option>
                  <option>Estimado</option>
                </select>
                <input
                  value={asegurado}
                  onChange={(e) => setBorrador((b) => ({ ...b, asegurado: e.target.value }))}
                  onBlur={(e) => confirmar("asegurado", e.target.value)}
                  style={campo}
                  aria-label="Nombre del asegurado"
                />
              </div>

              <label style={etiqueta}>Fecha (dd/mm/aaaa)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={fecha}
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  onChange={(e) => setBorrador((b) => ({ ...b, fecha: e.target.value }))}
                  onBlur={(e) => confirmar("fecha", e.target.value)}
                  style={campo}
                />
                <button type="button" style={{ ...btn, flexShrink: 0 }} onClick={() => confirmar("fecha", hoyDdMmAaaa())}>Hoy</button>
              </div>
              <div style={{ fontSize: 11, color: "var(--stone)", marginTop: 3 }}>Sale así en la carta: {fechaLarga(fecha) || "—"}</div>

              <label style={etiqueta}>Nombre de la aseguradora (para el texto)</label>
              <input
                value={aseguradora}
                onChange={(e) => setBorrador((b) => ({ ...b, aseguradora: e.target.value }))}
                onBlur={(e) => confirmar("aseguradora", e.target.value)}
                style={campo}
              />

              <SelectorImagen
                titulo="Logo de la aseguradora"
                ayuda="Se pone solo según la póliza; cárgalo si falta o quieres otro."
                src={logoAsegSrc}
                vacio="Sin logo"
                onElegir={(f) => cambiarImagen("logoAseg", f)}
                onQuitar={logoAsegPropio ? () => quitarImagen("logoAseg") : null}
                caja={{ w: 120, h: 50 }}
              />
              <SelectorImagen
                titulo="Tu logo"
                ayuda="Va al pie de la carta, a la izquierda."
                src={logoAgenteSrc}
                vacio="Sin logo"
                onElegir={(f) => cambiarImagen("logoAgente", f)}
                onQuitar={cfg && cfg.logoAgente ? () => quitarImagen("logoAgente") : null}
                caja={{ w: 120, h: 50 }}
              />
              <SelectorImagen
                titulo="Tu código QR"
                ayuda="Sin QR tampoco sale la leyenda “Recibe una asesoría…”."
                src={qrSrc}
                vacio="Sin QR"
                onElegir={(f) => cambiarImagen("qr", f)}
                onQuitar={cfg && cfg.qr ? () => quitarImagen("qr") : null}
                caja={{ w: 70, h: 70 }}
              />
              {errorImg && <p style={{ color: "#B23A2E", fontSize: 12, margin: "8px 0 0" }}>{errorImg}</p>}
              <p style={{ fontSize: 11, color: "var(--stone)", margin: "10px 0 0" }}>Los cambios de nombre, fecha y aseguradora se guardan en esta póliza; tu logo, tu QR y los logos de aseguradora quedan guardados para todas tus cartas.</p>
            </div>

            <div style={{ flex: "1 1 240px", maxWidth: 360, margin: "0 auto" }}>
              {carta ? (
                <img src={carta.vista} alt="Vista previa de la carta de bienvenida" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, boxShadow: "var(--shadow)", background: "#fff" }} />
              ) : (
                <div style={{ aspectRatio: "3 / 4", border: "1px dashed var(--line)", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 12, color: "var(--stone)" }}>
                  {errorCarta || "Preparando vista previa…"}
                </div>
              )}
              {errorCarta && carta && <p style={{ color: "#B23A2E", fontSize: 12 }}>{errorCarta}</p>}
            </div>
          </div>
        </div>
      )}

      <div style={tarjeta}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Enviar por WhatsApp</div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="radio" name={`modo-${client.id}`} checked={modo === "unico"} onChange={() => setModo("unico")} /> Un solo PDF
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="radio" name={`modo-${client.id}`} checked={modo === "separados"} onChange={() => setModo("separados")} /> Archivos separados
          </label>
        </div>

        <div style={{ fontSize: 12, color: armando ? "var(--stone)" : paquete && !paquete.vacio ? "#1E5C4C" : "#B23A2E", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          {armando || !paquete ? "Preparando paquete…" : paquete.vacio ? "No hay nada que enviar todavía." : (
            <><Check size={14} /> Paquete listo · {paquete.archivos.length} documento{paquete.archivos.length === 1 ? "" : "s"} · {paquete.paginas} páginas · {fmtTam(paquete.tam)}</>
          )}
        </div>
        {paquete && (paquete.avisos || []).map((a) => <p key={a} style={{ color: "#B23A2E", fontSize: 12, margin: "0 0 6px" }}>{a}</p>)}

        <label style={{ ...etiqueta, marginTop: 4 }}>Mensaje que acompaña al paquete</label>
        <textarea value={mensaje} onChange={(e) => setMensajeEditado(e.target.value)} rows={5} style={{ ...campo, resize: "vertical" }} />
        {mensajeEditado !== null && (
          <button type="button" style={{ ...btn, marginTop: 6, padding: "5px 10px", fontSize: 12 }} onClick={() => setMensajeEditado(null)}>Restablecer mensaje</button>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={{ ...btnPrim, flex: "1 1 200px", opacity: armando || !paquete || paquete.vacio ? 0.5 : 1 }} disabled={armando || !paquete || paquete.vacio} onClick={enviarPorWhatsApp}>
            <Share2 size={16} /> Enviar por WhatsApp
          </button>
          <button type="button" style={{ ...btn, opacity: armando || !paquete || paquete.vacio ? 0.5 : 1 }} disabled={armando || !paquete || paquete.vacio} onClick={descargarTodo}>
            <Download size={15} /> Descargar
          </button>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 12 }}>
          {linkChat && (
            <a href={linkChat} target="_blank" rel="noreferrer" style={{ color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <MessageCircle size={14} /> Abrir su chat con el mensaje
            </a>
          )}
          <button type="button" onClick={copiarMensaje} style={{ background: "none", border: "none", padding: 0, color: "var(--ink)", textDecoration: "underline", cursor: "pointer", fontSize: 12, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Mail size={14} /> Copiar mensaje
          </button>
        </div>
        {aviso && <p style={{ fontSize: 12, color: "var(--stone)", margin: "8px 0 0" }}>{aviso}</p>}
        <p style={{ fontSize: 11, color: "var(--stone)", margin: "10px 0 0" }}>
          Al tocar “Enviar por WhatsApp” se abre el menú de compartir del dispositivo: elige WhatsApp y al cliente. Si tu dispositivo no permite compartir archivos, se descarga el paquete y se abre el chat del cliente.
        </p>
      </div>
    </div>
  );
}
