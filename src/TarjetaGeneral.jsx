import React, { useState, useEffect, useRef } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { reducirImagen, formatearWhatsapp, linkWhatsapp, normalizarWeb } from "./TarjetaMC.jsx";

// Tarjeta digital "General": misma plantilla y funcionamiento que la de MC Brokers,
// con el logo de Inbursa y TODOS los datos editables (correo completo, dirección, cargo y lema).
export const PLANTILLA_GENERAL = "/tarjeta/plantilla-inbursa.jpg";
const BUCKET = "tarjetas-fotos";
const STORAGE_KEY = "tarjetaGeneral";

export const DATOS_INICIALES = {
  fotoUrl: "", nombre: "", cargo: "Agente de seguros",
  lema: "Tu tranquilidad hoy,\ntu patrimonio mañana.",
  whatsapp: "", correo: "", web: "", direccion: "", mapa: "", qrUrl: "", catalogo: "",
};

function webVisible(url) {
  return String(url || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function linkMapa(d) {
  if (String(d.mapa || "").trim()) return normalizarWeb(d.mapa);
  const dir = String(d.direccion || "").trim();
  return dir ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}` : "";
}

// ---------- Vista de la tarjeta (editor y liga pública). Coordenadas en % sobre la plantilla de 1125 x 2000 ----------
export function TarjetaVistaGeneral({ d, editable, onFotoClick, onQrClick }) {
  const nombre = d.nombre || "";
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  const linea1 = palabras[0] || "";
  const linea2 = palabras.slice(1).join(" ");
  const maxLen = Math.max(linea1.length, linea2.length, 6);
  const tamNombre = Math.min(7.4, 44 / (maxLen * 0.56));

  const wTxt = formatearWhatsapp(d.whatsapp);
  const wLink = linkWhatsapp(d.whatsapp, nombre);
  const correo = String(d.correo || "").trim();
  const webTxt = webVisible(d.web);
  const dir = String(d.direccion || "").trim();
  const tamLinea = (txt) => Math.min(4.6, 78 / (Math.max(txt.length, 1) * 0.56));

  const cargo = String(d.cargo || "").trim();
  const tamCargo = Math.min(3.0, 43 / (Math.max(cargo.length, 1) * 0.97));
  const lema = String(d.lema || "").trim();
  const maxLema = Math.max(...lema.split("\n").map((l) => l.length), 1);
  const tamLema = Math.min(3.8, 52 / (maxLema * 0.5));

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
          overflow: "hidden", textOverflow: "ellipsis", display: opciones.multilinea ? "-webkit-box" : "block",
          ...(opciones.multilinea ? { WebkitLineClamp: 3, WebkitBoxOrient: "vertical" } : {}),
          minHeight: "6cqw", paddingTop: "1.5cqw", paddingBottom: "1.5cqw",
        }}
      >
        {mostrar}
      </Tag>
    );
  };

  const linkCatalogo = !editable && d.catalogo ? normalizarWeb(d.catalogo) : "";
  const QrTag = linkCatalogo ? "a" : "div";

  return (
    <div
      style={{
        width: "100%", aspectRatio: "1125 / 2000", position: "relative", overflow: "hidden",
        containerType: "inline-size", background: "#0B2A44", borderRadius: "5cqw",
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      <img
        src={PLANTILLA_GENERAL} alt="Tarjeta digital"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Foto */}
      <div
        onClick={editable ? onFotoClick : undefined}
        role={editable ? "button" : undefined}
        aria-label={editable ? "Cambiar foto" : undefined}
        style={
          d.fotoUrl
            ? {
                position: "absolute", left: "52.76%", top: "18.225%", width: "41.6%", aspectRatio: "1",
                boxSizing: "border-box", borderRadius: "50%", overflow: "hidden", border: "0.8cqw solid #fff",
                background: "#fff", boxShadow: "0 0.6cqw 2.4cqw rgba(0,0,0,0.28)", cursor: editable ? "pointer" : "default",
              }
            : {
                position: "absolute", left: "54.44%", top: "18.95%", width: "38.4%", aspectRatio: "1",
                borderRadius: "50%", cursor: editable ? "pointer" : "default",
              }
        }
      >
        {d.fotoUrl && (
          <img src={d.fotoUrl} alt={nombre || "Agente"} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
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

      {/* Cargo */}
      {cargo && (
        <div
          style={{
            position: "absolute", left: "8.9%", top: "36.9%", transform: "translateY(-50%)", width: "44%",
            color: "#fff", fontWeight: 300, textTransform: "uppercase", letterSpacing: "0.34em",
            fontSize: `${tamCargo}cqw`, whiteSpace: "nowrap", overflow: "hidden",
          }}
        >
          {cargo}
        </div>
      )}

      {/* Lema */}
      {lema && (
        <div
          style={{
            position: "absolute", left: "6.2%", top: "43.6%", transform: "translateY(-50%)", width: "53%",
            color: "#fff", fontStyle: "italic", fontWeight: 400, fontSize: `${tamLema}cqw`,
            lineHeight: 1.35, whiteSpace: "pre-line",
          }}
        >
          {lema}
        </div>
      )}

      {/* Datos de contacto */}
      {fila(52.75, wLink, wTxt, "+52 000 000 0000", 4.6)}
      {fila(57.5, correo ? `mailto:${correo}` : "", correo, "correo@ejemplo.com", tamLinea(correo || "correo@ejemplo.com"))}
      {fila(62, d.web ? normalizarWeb(d.web) : "", webTxt, "tusitio.com", tamLinea(webTxt || "tusitio.com"))}
      {fila(66.75, linkMapa(d), dir, "Tu dirección", 2.9, { multilinea: true })}

      {/* QR: en la tarjeta pública abre el catálogo (el enlace no se muestra) */}
      <QrTag
        {...(linkCatalogo ? { href: linkCatalogo, target: "_blank", rel: "noreferrer", "aria-label": "Ver catálogo" } : {})}
        onClick={editable ? onQrClick : undefined}
        role={editable ? "button" : undefined}
        style={{
          position: "absolute", left: "6.1%", top: "71.5%", width: "19.7%", aspectRatio: "1",
          borderRadius: "2cqw", overflow: "hidden", cursor: editable || linkCatalogo ? "pointer" : "default",
          background: d.qrUrl ? "#fff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {d.qrUrl && <img src={d.qrUrl} alt="Código QR" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4%" }} />}
      </QrTag>
    </div>
  );
}

// ---------- Liga pública /g/<id> ----------
export function TarjetaPublicaGeneral({ agentId }) {
  const [d, setD] = useState(undefined);
  useEffect(() => {
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from("public_cards_general").select("datos").eq("agent_id", agentId).maybeSingle();
        if (error) throw error;
        setD(row ? { ...DATOS_INICIALES, ...row.datos } : null);
      } catch (e) {
        setD(null);
      }
    })();
  }, [agentId]);

  const caja = { background: "#F7F5F0", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Manrope', system-ui, sans-serif" };
  if (d === undefined) return <div style={caja} />;
  if (!d) return <div style={caja}><p style={{ fontSize: 16, color: "#1B2A41", fontWeight: 600 }}>Esta tarjeta no está disponible.</p></div>;
  return (
    <div style={caja}>
      <div style={{ width: 340, maxWidth: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.18)", borderRadius: 20 }}>
        <TarjetaVistaGeneral d={d} />
      </div>
    </div>
  );
}

// ---------- Editor ----------
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
  const pick = (e) => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ""; };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{titulo}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {url ? (
          <img src={url} alt={titulo} style={{ width: 52, height: 52, objectFit: circular ? "cover" : "contain", background: "#fff", borderRadius: circular ? "50%" : 8, border: "1px solid var(--line)" }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: circular ? "50%" : 8, background: "#F0EEE6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera size={20} color="#8794A0" />
          </div>
        )}
        <label style={botonOscuro}>
          <ImageIcon size={14} /> {subiendo ? "Subiendo..." : "Galería"}
          <input type="file" accept="image/*" style={{ display: "none" }} disabled={subiendo} onChange={pick} />
        </label>
        <label style={botonClaro}>
          <Camera size={14} /> Cámara
          <input type="file" accept="image/*" capture={camara} style={{ display: "none" }} disabled={subiendo} onChange={pick} />
        </label>
      </div>
      {ayuda && <p style={{ fontSize: 11, color: "#8794A0", marginTop: 6 }}>{ayuda}</p>}
    </div>
  );
}

export default function TarjetaGeneral({ userId, profile }) {
  const [d, setD] = useState(DATOS_INICIALES);
  const [cargada, setCargada] = useState(false);
  const [error, setError] = useState("");
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoQr, setSubiendoQr] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef(null);
  const ligaPublica = userId ? `${window.location.origin}/g/${userId}` : "";

  // Carga lo guardado (si no hay nombre, usa el del perfil)
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        const guardado = res && res.value ? JSON.parse(res.value) : {};
        setD({ ...DATOS_INICIALES, ...guardado });
      } catch (e) {
        console.error("No se pudo cargar la tarjeta general:", e);
      }
      setCargada(true);
    })();
  }, []);

  // Guarda en el CRM y en la tabla pública (liga /g/<id>), con una pequeña espera mientras se escribe
  useEffect(() => {
    if (!cargada) return;
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      window.storage.set(STORAGE_KEY, JSON.stringify(d)).catch(() => {});
      if (!userId) return;
      const publico = { ...d, nombre: d.nombre || profile?.nombre || "" };
      const { error: err } = await supabase.from("public_cards_general").upsert(
        { agent_id: userId, datos: publico, updated_at: new Date().toISOString() },
        { onConflict: "agent_id" }
      );
      if (err) setError(`No se pudo actualizar la liga pública: ${err.message}`);
    }, 600);
    return () => clearTimeout(temporizador.current);
  }, [d, cargada, userId, profile]);

  const nombre = d.nombre || profile?.nombre || "";
  const vista = { ...d, nombre };
  const cambiar = (campo, valor) => setD((x) => ({ ...x, [campo]: valor }));

  async function subir(file, archivo, maxLado, tipo, campo, setSubiendo, etiqueta) {
    setError("");
    setSubiendo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión activa.");
      const blob = await reducirImagen(file, maxLado, tipo);
      const path = `${user.id}/${archivo}.${tipo === "image/png" ? "png" : "jpg"}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: tipo });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      cambiar(campo, `${data.publicUrl}?v=${Date.now()}`);
    } catch (e) {
      setError(`No se pudo subir ${etiqueta}: ${e.message}`);
    } finally {
      setSubiendo(false);
    }
  }
  const subirFoto = (f) => subir(f, "general-foto", 1000, "image/jpeg", "fotoUrl", setSubiendoFoto, "la foto");
  const subirQr = (f) => subir(f, "general-qr", 900, "image/png", "qrUrl", setSubiendoQr, "el QR");

  function tocarImagen(handler) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => { const f = input.files[0]; if (f) handler(f); };
    input.click();
  }

  function copiarLiga() {
    navigator.clipboard.writeText(ligaPublica).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const campo = (label, key, props = {}, nota) => (
    <>
      <label style={labelStyle}>{label}</label>
      <input
        value={d[key] || ""} onChange={(e) => cambiar(key, e.target.value)}
        style={{ ...inputBase, marginBottom: nota ? 4 : 12 }} {...props}
      />
      {nota && <p style={{ fontSize: 11, color: "#8794A0", marginBottom: 12 }}>{nota}</p>}
    </>
  );

  return (
    <div>
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <SelectorImagen
          titulo="Foto" circular url={d.fotoUrl} subiendo={subiendoFoto} onFile={subirFoto} camara="user"
          ayuda="Elígela de la galería o tómala con la cámara."
        />

        <label style={labelStyle}>Nombre</label>
        <input value={nombre} onChange={(e) => cambiar("nombre", e.target.value)} placeholder="Nombre y apellidos" style={{ ...inputBase, marginBottom: 12 }} />

        {campo("Puesto o título", "cargo", { placeholder: "Agente de seguros" })}

        <label style={labelStyle}>Frase (lema)</label>
        <textarea
          value={d.lema || ""} onChange={(e) => cambiar("lema", e.target.value)} rows={2}
          placeholder={"Tu tranquilidad hoy,\ntu patrimonio mañana."}
          style={{ ...inputBase, marginBottom: 4, resize: "vertical", fontFamily: "inherit" }}
        />
        <p style={{ fontSize: 11, color: "#8794A0", marginBottom: 12 }}>Usa Enter para pasar a la segunda línea.</p>

        {campo("WhatsApp (10 dígitos)", "whatsapp", { inputMode: "tel", placeholder: "222 123 4567" },
          "Al tocarlo en la tarjeta se abre WhatsApp con un mensaje listo para enviarte.")}
        {campo("Correo", "correo", { inputMode: "email", autoCapitalize: "none", autoCorrect: "off", placeholder: "correo@ejemplo.com" })}
        {campo("Enlace de tu página web", "web", { inputMode: "url", autoCapitalize: "none", autoCorrect: "off", placeholder: "tusitio.com" })}

        <label style={labelStyle}>Dirección</label>
        <textarea
          value={d.direccion || ""} onChange={(e) => cambiar("direccion", e.target.value)} rows={3}
          placeholder="Calle, número, colonia, ciudad"
          style={{ ...inputBase, marginBottom: 12, resize: "vertical", fontFamily: "inherit" }}
        />
        {campo("Enlace del mapa (opcional)", "mapa", { inputMode: "url", autoCapitalize: "none", autoCorrect: "off", placeholder: "https://maps.app.goo.gl/..." },
          "Si lo dejas vacío, la dirección abre Google Maps con una búsqueda automática.")}

        <div style={{ height: 4 }} />
        <SelectorImagen
          titulo="Imagen de tu QR" url={d.qrUrl} subiendo={subiendoQr} onFile={subirQr} camara="environment"
          ayuda="Sube la imagen del QR desde la galería o tómale una foto."
        />

        {campo("Enlace del catálogo de WhatsApp Business", "catalogo", { inputMode: "url", autoCapitalize: "none", autoCorrect: "off", placeholder: "https://wa.me/c/521..." })}
        <p style={{ fontSize: 11, color: "#8794A0", marginTop: -8 }}>
          No se muestra en la tarjeta: solo hace que, al tocar el QR, tu cliente abra tu catálogo.
          {d.catalogo ? (
            <> <a href={normalizarWeb(d.catalogo)} target="_blank" rel="noreferrer" style={{ color: "var(--emerald)", fontWeight: 600, textDecoration: "underline" }}>Probar enlace</a></>
          ) : null}
        </p>
      </div>

      {error && <p style={{ fontSize: 12, color: "#B23A2E", marginBottom: 14 }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <div style={{ width: 300, maxWidth: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.18)", borderRadius: 18 }}>
          <TarjetaVistaGeneral d={vista} editable onFotoClick={() => tocarImagen(subirFoto)} onQrClick={() => tocarImagen(subirQr)} />
        </div>
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "#8794A0", marginBottom: 18 }}>
        Así la verá tu cliente. WhatsApp, correo, web y dirección ya son enlaces.
      </p>

      {userId && nombre && (
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
          <label style={labelStyle}>Tu liga pública (compártela con tus clientes)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input readOnly value={ligaPublica} onFocus={(e) => e.target.select()} style={{ ...inputBase, flex: 1, fontSize: 12, color: "var(--muted)" }} />
            <button onClick={copiarLiga} style={{ background: "var(--ink)", color: "var(--cream)", borderRadius: 10, padding: "0 14px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
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
