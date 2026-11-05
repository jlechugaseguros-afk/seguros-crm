import React, { useRef, useState } from "react";
import { Camera, Trash2, X } from "lucide-react";
import { reducirImagen } from "./TarjetaMC.jsx";

// Datos del asesor que salen en la portada y en la última hoja del entregable del Diagnóstico patrimonial.
// Cada agente guarda los suyos (foto, nombre, título, teléfono, correo, sitio web, "Sobre mí", QR con su leyenda y logo).

const aDataUrl = (blob) => new Promise((ok, no) => {
  const fr = new FileReader();
  fr.onload = () => ok(fr.result);
  fr.onerror = () => no(new Error("No se pudo leer la imagen."));
  fr.readAsDataURL(blob);
});

const campo = { border: "1px solid #D5DDE5", background: "#F4F7FA", borderRadius: 10, padding: 10, font: "inherit", width: "100%", boxSizing: "border-box", color: "#10202D" };
const etiqueta = { fontSize: 13, fontWeight: 600, color: "#41566A", display: "flex", flexDirection: "column", gap: 5 };
const ayuda = { fontSize: 12, color: "#5B6E80", fontWeight: 400 };

function Imagen({ titulo, ayudaTexto, valor, onElegir, onQuitar, cuadro, vacio }) {
  const ref = useRef(null);
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: cuadro.w, height: cuadro.h, flex: "none", borderRadius: 10, border: "1px dashed #B8C4CF", background: "#F4F7FA", overflow: "hidden", display: "grid", placeItems: "center" }}>
        {valor ? <img src={valor} alt={titulo} style={{ width: "100%", height: "100%", objectFit: cuadro.ajuste || "cover" }} /> : <span style={{ fontSize: 11, color: "#7A8C9C", textAlign: "center", padding: 6 }}>{vacio}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <b style={{ fontSize: 13, color: "#41566A" }}>{titulo}</b>
        <span style={ayuda}>{ayudaTexto}</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="dpl-btn" onClick={() => ref.current && ref.current.click()}><Camera size={15} /> {valor ? "Cambiar" : "Cargar"}</button>
          {valor && onQuitar && <button type="button" className="dpl-btn danger" onClick={onQuitar} aria-label={`Quitar ${titulo}`}><Trash2 size={15} /></button>}
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onElegir(f); }} />
      </div>
    </div>
  );
}

export default function PerfilAsesor({ perfil, onGuardar, onCerrar, logoPredeterminado }) {
  const [f, setF] = useState({ ...perfil });
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function imagen(k, file, lado, tipo) {
    setError("");
    setOcupado(true);
    try {
      const blob = await reducirImagen(file, lado, tipo, 0.86);
      set(k, await aDataUrl(blob));
    } catch (e) {
      setError(e.message || "No se pudo cargar la imagen.");
    } finally {
      setOcupado(false);
    }
  }

  async function guardar() {
    setOcupado(true);
    const ok = await onGuardar({ ...f, nombre: (f.nombre || "").trim(), titulo: (f.titulo || "").trim(), whatsapp: (f.whatsapp || "").trim(), correo: (f.correo || "").trim(), web: (f.web || "").trim(), qrLeyenda: (f.qrLeyenda || "").trim(), sobreMi: (f.sobreMi || "").trim() });
    setOcupado(false);
    if (ok === false) setError("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
  }

  return (
    <div className="dpl-modal" role="dialog" aria-modal="true" onClick={onCerrar} style={{ alignItems: "start", overflowY: "auto" }}>
      <div className="dpl-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, margin: "24px auto" }}>
        <h3>Mis datos de asesor</h3>
        <p>Salen en la portada y en la última hoja de todos tus entregables. Se guardan en tu cuenta: cámbialos aquí cuando quieras.</p>

        <Imagen titulo="Foto" ayudaTexto="Retrato vertical, de la galería o la cámara." valor={f.fotoUrl} cuadro={{ w: 76, h: 95 }} vacio="Sin foto" onElegir={(file) => imagen("fotoUrl", file, 640, "image/jpeg")} onQuitar={() => set("fotoUrl", "")} />

        <label style={etiqueta}>Nombre del agente<input style={campo} value={f.nombre || ""} onChange={(e) => set("nombre", e.target.value)} autoComplete="name" /></label>
        <label style={etiqueta}>Título o cargo<input style={campo} value={f.titulo || ""} onChange={(e) => set("titulo", e.target.value)} placeholder="Asesor en protección y planeación patrimonial" /></label>
        <label style={etiqueta}>Teléfono / WhatsApp<input style={campo} type="tel" value={f.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} autoComplete="tel" /></label>
        <label style={etiqueta}>Correo<input style={campo} type="email" value={f.correo || ""} onChange={(e) => set("correo", e.target.value)} autoComplete="email" /></label>
        <label style={etiqueta}>Sitio web o enlace (opcional)<input style={campo} value={f.web || ""} onChange={(e) => set("web", e.target.value)} placeholder="www.tusitio.com" /></label>

        <label style={etiqueta}>
          Sobre mí (tu historia o presentación)
          <textarea style={{ ...campo, minHeight: 170, resize: "vertical", lineHeight: 1.45 }} value={f.sobreMi || ""} onChange={(e) => set("sobreMi", e.target.value)} placeholder="Cuéntale a tu cliente quién eres, cuánto tiempo llevas asesorando y cómo trabajas." />
          <span style={ayuda}>Separa los párrafos con una línea en blanco. Si escribes tres o más, el último se resalta como frase final.</span>
        </label>

        <Imagen titulo="Código QR" ayudaTexto="Imagen de tu QR (tu sitio, catálogo o WhatsApp). Si no cargas uno, no sale en el entregable." valor={f.qrUrl} cuadro={{ w: 90, h: 90, ajuste: "contain" }} vacio="Sin QR" onElegir={(file) => imagen("qrUrl", file, 700, "image/png")} onQuitar={() => set("qrUrl", "")} />
        <label style={etiqueta}>Texto junto al QR<input style={campo} value={f.qrLeyenda || ""} onChange={(e) => set("qrLeyenda", e.target.value)} placeholder="Conoce toda la gama de productos que tenemos para proteger y hacer crecer tu patrimonio." /></label>

        <Imagen titulo="Logo" ayudaTexto="Sale en la portada y en el encabezado de cada hoja. Si no cargas uno, se usa el predeterminado." valor={f.logoUrl || logoPredeterminado} cuadro={{ w: 110, h: 60, ajuste: "contain" }} vacio="Sin logo" onElegir={(file) => imagen("logoUrl", file, 700, "image/png")} onQuitar={f.logoUrl ? () => set("logoUrl", "") : null} />

        {error && <p style={{ color: "#B23A2E", fontSize: 13 }}>{error}</p>}
        <div className="fila">
          <button className="dpl-btn gold" onClick={guardar} disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</button>
          <button className="dpl-btn" onClick={onCerrar} disabled={ocupado}><X size={16} /> Cancelar</button>
        </div>
      </div>
    </div>
  );
}
