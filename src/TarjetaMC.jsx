import React, { useState } from "react";
import { Camera, Image as ImageIcon, MapPin } from "lucide-react";
import PageHeader from "./PageHeader.jsx";

// ---------- Constantes de la tarjeta MC Brokers ----------
export const PLANTILLA_MC = "/tarjeta/plantilla-mc.jpg";
export const DOMINIO_CORREO = "@mcbrokers.com.mx";
export const DIRECCION_OFICINA =
  "Priv. 25 Sur 3921, Reserva Territorial Atlixcáyotl, La Noria, 72410 Heroica Puebla de Zaragoza, Pue.";
export const LINK_MAPA = "https://maps.app.goo.gl/pftdeUrXokH4VZgA6";

// ---------- Utilidades ----------
export function normalizarWhatsapp(valor) {
  const d = String(valor || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return `52${d}`;
  return d;
}

export function formatearWhatsapp(valor) {
  const n = normalizarWhatsapp(valor);
  if (n.length === 12 && n.startsWith("52")) {
    return `+52 ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
  }
  return n ? `+${n}` : "";
}

export function linkWhatsapp(valor, nombre) {
  const n = normalizarWhatsapp(valor);
  if (!n) return "";
  const primer = String(nombre || "").trim().split(/\s+/)[0];
  const saludo = primer ? `Hola ${primer}` : "Hola";
  const texto = `${saludo}, vi tu tarjeta digital y me gustaría recibir información sobre seguros.`;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

export function correoCompleto(usuario) {
  const u = String(usuario || "").trim().split("@")[0].replace(/\s/g, "");
  return u ? `${u}${DOMINIO_CORREO}` : "";
}

export function normalizarWeb(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function webVisible(url) {
  return String(url || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

// Reduce el tamaño de fotos tomadas con la cámara antes de subirlas
export function reducirImagen(file, maxLado, tipo = "image/jpeg", calidad = 0.88) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxLado / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      const ctx = c.getContext("2d");
      if (tipo === "image/jpeg") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
      }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen."))), tipo, calidad);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

// ---------- Vista de la tarjeta (editor y liga pública) ----------
// Las coordenadas están en % sobre la plantilla de 1125 x 2000.
export function TarjetaVista({ nombre, fotoUrl, whatsapp, correo, web, qrUrl, editable, onFotoClick, onQrClick }) {
  const palabras = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  const linea1 = palabras[0] || "";
  const linea2 = palabras.slice(1).join(" ");
  const maxLen = Math.max(linea1.length, linea2.length, 6);
  const tamNombre = Math.min(7.4, 44 / (maxLen * 0.56));

  const wTxt = formatearWhatsapp(whatsapp);
  const wLink = linkWhatsapp(whatsapp, nombre);
  const webTxt = webVisible(web);
  const tamLinea = (txt) => Math.min(4.6, 78 / (Math.max(txt.length, 1) * 0.56));

  const fila = (y, href, texto, placeholder, size, opciones = {}) => {
    const mostrar = texto || (editable ? placeholder : "");
    if (!mostrar) return null;
    const Tag = href ? "a" : "div";
    return (
      <Tag
        {...(href ? { href, target: "_blank", rel: "noreferrer" } : {})}
        style={{
          position: "absolute", left: "5%", right: "4%", top: `${y}%`, transform: "translateY(-50%)",
          paddingLeft: "10.2%", color: "#fff", textDecoration: "none", fontSize: `${size}cqw`,
          lineHeight: 1.3, opacity: texto ? 1 : 0.35, whiteSpace: opciones.multilinea ? "normal" : "nowrap",
          overflow: "hidden", textOverflow: "ellipsis", display: "block", minHeight: "6cqw",
          paddingTop: "1.5cqw", paddingBottom: "1.5cqw",
        }}
      >
        {mostrar}
      </Tag>
    );
  };

  return (
    <div
      style={{
        width: "100%", aspectRatio: "1125 / 2000", position: "relative", overflow: "hidden",
        containerType: "inline-size", background: "#0B2A44", borderRadius: "5cqw",
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      <img
        src={PLANTILLA_MC}
        alt="Tarjeta MC Brokers"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Foto del agente: con foto, el círculo cubre el marco de la plantilla y dibuja uno propio, parejo en todo el contorno */}
      <div
        onClick={editable ? onFotoClick : undefined}
        role={editable ? "button" : undefined}
        aria-label={editable ? "Cambiar foto" : undefined}
        style={
          fotoUrl
            ? {
                position: "absolute", left: "52.76%", top: "18.225%", width: "41.6%", aspectRatio: "1",
                boxSizing: "border-box", borderRadius: "50%", overflow: "hidden", border: "0.8cqw solid #fff",
                background: "#fff", boxShadow: "0 0.6cqw 2.4cqw rgba(0,0,0,0.28)",
                cursor: editable ? "pointer" : "default",
              }
            : {
                position: "absolute", left: "54.44%", top: "18.95%", width: "38.4%", aspectRatio: "1",
                borderRadius: "50%", cursor: editable ? "pointer" : "default",
              }
        }
      >
        {fotoUrl && (
          <img
            src={fotoUrl} alt={nombre || "Agente"}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          />
        )}
      </div>

      {/* Nombre */}
      <div
        style={{
          position: "absolute", left: "8.9%", top: "24.6%", height: "9.75%", width: "44%",
          display: "flex", flexDirection: "column", justifyContent: "center", color: "#fff",
          fontSize: `${tamNombre}cqw`, lineHeight: 1.12, opacity: linea1 ? 1 : 0.35,
        }}
      >
        {linea1 ? (
          <>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{linea1}</span>
            {linea2 && <span style={{ fontWeight: 300, whiteSpace: "nowrap" }}>{linea2}</span>}
          </>
        ) : (
          editable && <span style={{ fontWeight: 700 }}>Tu nombre</span>
        )}
      </div>

      {/* Datos de contacto */}
      {fila(52.75, wLink, wTxt, "+52 000 000 0000", 4.6)}
      {fila(57.5, correo ? `mailto:${correo}` : "", correo, `tunombre${DOMINIO_CORREO}`, tamLinea(correo || `tunombre${DOMINIO_CORREO}`))}
      {fila(62, web ? normalizarWeb(web) : "", webTxt, "tusitio.com", tamLinea(webTxt || "tusitio.com"))}
      {fila(66.75, LINK_MAPA, DIRECCION_OFICINA, "", 2.9, { multilinea: true })}

      {/* QR */}
      <div
        onClick={editable ? onQrClick : undefined}
        role={editable ? "button" : undefined}
        aria-label={editable ? "Cambiar QR" : undefined}
        style={{
          position: "absolute", left: "6.1%", top: "71.5%", width: "19.7%", aspectRatio: "1",
          borderRadius: "2cqw", overflow: "hidden", cursor: editable ? "pointer" : "default",
          background: qrUrl ? "#fff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {qrUrl && <img src={qrUrl} alt="Código QR" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4%" }} />}
      </div>
    </div>
  );
}

// ---------- Editor (pestaña Tarjeta digital) ----------
const labelStyle = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 };
const inputBase = {
  width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px",
  fontSize: 14, background: "#fff", color: "var(--ink)", outline: "none",
};
const botonOscuro = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "var(--ink)", color: "var(--cream)",
  borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const botonClaro = { ...botonOscuro, background: "#fff", color: "var(--ink)", border: "1px solid var(--line)" };

function SelectorImagen({ titulo, ayuda, url, circular, subiendo, onFile, camara }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{titulo}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {url ? (
          <img
            src={url} alt={titulo}
            style={{
              width: 52, height: 52, objectFit: circular ? "cover" : "contain", background: "#fff",
              borderRadius: circular ? "50%" : 8, border: "1px solid var(--line)",
            }}
          />
        ) : (
          <div style={{
            width: 52, height: 52, borderRadius: circular ? "50%" : 8, background: "#F0EEE6",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Camera size={20} color="#8794A0" />
          </div>
        )}
        <label style={botonOscuro}>
          <ImageIcon size={14} /> {subiendo ? "Subiendo..." : "Galería"}
          <input
            type="file" accept="image/*" style={{ display: "none" }} disabled={subiendo}
            onChange={(e) => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ""; }}
          />
        </label>
        <label style={botonClaro}>
          <Camera size={14} /> Cámara
          <input
            type="file" accept="image/*" capture={camara} style={{ display: "none" }} disabled={subiendo}
            onChange={(e) => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ""; }}
          />
        </label>
      </div>
      {ayuda && <p style={{ fontSize: 11, color: "#8794A0", marginTop: 6 }}>{ayuda}</p>}
    </div>
  );
}

export default function TarjetaDigital({ tarjeta, profile, userId, onChange, onFoto, onQr, subiendoFoto, subiendoQr, error }) {
  const nombre = tarjeta.nombre ?? profile?.nombre ?? "";
  const correo = correoCompleto(tarjeta.correoUsuario);
  const [copiado, setCopiado] = useState(false);
  const ligaPublica = userId ? `${window.location.origin}/t/${userId}` : "";

  function copiarLiga() {
    navigator.clipboard.writeText(ligaPublica).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  // Al tocar la foto/QR en la tarjeta, abre el selector del teléfono (galería o cámara)
  function tocarImagen(handler) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files[0];
      if (f) handler(f);
    };
    input.click();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Identidad"
        title="Tarjeta digital"
        subtitle="Llena tus datos y la tarjeta se arma sola. También puedes tocar la foto o el QR dentro de la tarjeta para cambiarlos."
      />

      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <SelectorImagen
          titulo="Foto del agente" circular url={tarjeta.fotoUrl} subiendo={subiendoFoto}
          onFile={onFoto} camara="user" ayuda="Elígela de la galería o tómala con la cámara."
        />

        <label style={labelStyle}>Nombre del agente</label>
        <input
          value={nombre}
          onChange={(e) => onChange("nombre", e.target.value)}
          placeholder="Nombre y apellidos"
          style={{ ...inputBase, marginBottom: 12 }}
        />

        <label style={labelStyle}>WhatsApp (10 dígitos)</label>
        <input
          value={tarjeta.whatsapp || ""}
          onChange={(e) => onChange("whatsapp", e.target.value)}
          inputMode="tel"
          placeholder="222 123 4567"
          style={{ ...inputBase, marginBottom: 4 }}
        />
        <p style={{ fontSize: 11, color: "#8794A0", marginBottom: 12 }}>
          Al tocarlo en la tarjeta se abre WhatsApp con un mensaje listo para enviarte.
        </p>

        <label style={labelStyle}>Correo</label>
        <div style={{ display: "flex", alignItems: "stretch", marginBottom: 12 }}>
          <input
            value={tarjeta.correoUsuario || ""}
            onChange={(e) => onChange("correoUsuario", e.target.value.split("@")[0].replace(/\s/g, ""))}
            autoCapitalize="none" autoCorrect="off" inputMode="email"
            placeholder="nombre.apellido"
            style={{ ...inputBase, borderTopRightRadius: 0, borderBottomRightRadius: 0, minWidth: 0 }}
          />
          <span style={{
            display: "flex", alignItems: "center", padding: "0 10px", fontSize: 13, color: "var(--muted)",
            background: "#F0EEE6", border: "1px solid var(--line)", borderLeft: "none",
            borderTopRightRadius: 10, borderBottomRightRadius: 10, whiteSpace: "nowrap",
          }}>
            {DOMINIO_CORREO}
          </span>
        </div>

        <label style={labelStyle}>Enlace de tu página web</label>
        <input
          value={tarjeta.web || ""}
          onChange={(e) => onChange("web", e.target.value)}
          autoCapitalize="none" autoCorrect="off" inputMode="url"
          placeholder="tusitio.com"
          style={{ ...inputBase, marginBottom: 12 }}
        />

        <label style={labelStyle}>Dirección</label>
        <a
          href={LINK_MAPA} target="_blank" rel="noreferrer"
          style={{
            display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10,
            background: "#F0EEE6", color: "var(--ink)", fontSize: 13, textDecoration: "none", marginBottom: 16,
          }}
        >
          <MapPin size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{DIRECCION_OFICINA}</span>
        </a>

        <SelectorImagen
          titulo="Imagen de tu QR" url={tarjeta.qrUrl} subiendo={subiendoQr}
          onFile={onQr} camara="environment" ayuda="Sube la imagen del QR desde la galería o tómale una foto."
        />
      </div>

      {error && <p style={{ fontSize: 12, color: "#B23A2E", marginBottom: 14 }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <div style={{ width: 300, maxWidth: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.18)", borderRadius: 18 }}>
          <TarjetaVista
            nombre={nombre}
            fotoUrl={tarjeta.fotoUrl}
            whatsapp={tarjeta.whatsapp}
            correo={correo}
            web={tarjeta.web}
            qrUrl={tarjeta.qrUrl}
            editable
            onFotoClick={() => tocarImagen(onFoto)}
            onQrClick={() => tocarImagen(onQr)}
          />
        </div>
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "#8794A0", marginBottom: 18 }}>
        Así la verá tu cliente. WhatsApp, correo, web y dirección ya son enlaces.
      </p>

      {userId && nombre && (
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
          <label style={labelStyle}>Tu liga pública (compártela con tus clientes)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              readOnly value={ligaPublica} onFocus={(e) => e.target.select()}
              style={{ ...inputBase, flex: 1, fontSize: 12, color: "var(--muted)" }}
            />
            <button
              onClick={copiarLiga}
              style={{ background: "var(--ink)", color: "var(--cream)", borderRadius: 10, padding: "0 14px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
            >
              {copiado ? "¡Copiada!" : "Copiar"}
            </button>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent("Aquí está mi tarjeta digital: " + ligaPublica)}`}
            target="_blank" rel="noreferrer"
            style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "var(--emerald)", fontWeight: 600, textDecoration: "underline" }}
          >
            Compartir por WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
