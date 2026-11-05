import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileImage, FileSpreadsheet, FileText, Trash2, Upload } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import PageHeader from "./PageHeader.jsx";
import { esCuentaDemo } from "./demo.js";

// Material compartido entre todos los agentes (tabla material_compartido + bucket privado "documentos").
// Cualquier agente con sesión puede ver, descargar y agregar archivos; solo quien subió un archivo puede borrarlo.
// Secciones: "condiciones" (Condiciones generales), "formatos" y "publicidad" (pestaña Material de apoyo).

const BUCKET = "documentos";
const CARPETAS = {
  condiciones: "condiciones",
  formatos: "material-formatos",
  publicidad: "material-publicidad",
};

function slug(str) {
  return (
    String(str)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "archivo"
  );
}

function fechaCorta(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function conDescarga(url, nombre) {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(nombre || "archivo")}`;
}

export function useMaterialCompartido(seccion, nombreAgente = "") {
  const [items, setItems] = useState([]);
  const [urls, setUrls] = useState({});
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");

  const firmar = useCallback(async (rows) => {
    const paths = rows.map((r) => r.path).filter(Boolean);
    if (paths.length === 0) return;
    const { data, error: e } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
    if (e || !data) return;
    setUrls((u) => {
      const next = { ...u };
      data.forEach((d) => {
        if (d.path && d.signedUrl) next[d.path] = d.signedUrl;
      });
      return next;
    });
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const { data, error: e } = await supabase
        .from("material_compartido")
        .select("*")
        .eq("seccion", seccion)
        .order("created_at", { ascending: false });
      if (e) throw e;
      const rows = (data || []).map((r) => ({ ...r, name: r.nombre }));
      setItems(rows);
      await firmar(rows);
      setError("");
    } catch (e) {
      console.error("No se pudo cargar el material compartido:", e);
      setError("No se pudo cargar el material compartido. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [seccion, firmar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = useCallback(
    async ({ file, ramo = null, aseguradora = null }) => {
      setError("");
      setSubiendo(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sin sesión activa.");
        if (esCuentaDemo(user)) throw new Error("En la demo no se pueden subir archivos al material compartido.");
        const path = `${CARPETAS[seccion]}/${user.id}/${Date.now()}-${slug(file.name)}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data, error: insErr } = await supabase
          .from("material_compartido")
          .insert({
            seccion,
            nombre: file.name,
            path,
            ramo,
            aseguradora,
            subido_por: user.id,
            subido_por_nombre: nombreAgente || null,
          })
          .select()
          .single();
        if (insErr) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw insErr;
        }
        const row = { ...data, name: data.nombre };
        setItems((xs) => [row, ...xs]);
        await firmar([row]);
        return true;
      } catch (e) {
        setError(`No se pudo subir "${file.name}": ${e.message}`);
        return false;
      } finally {
        setSubiendo(false);
      }
    },
    [seccion, nombreAgente, firmar]
  );

  const quitar = useCallback(async (item) => {
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (esCuentaDemo(user)) throw new Error("en la demo no se puede borrar material compartido");
      const { error: delErr } = await supabase.from("material_compartido").delete().eq("id", item.id);
      if (delErr) throw delErr;
      setItems((xs) => xs.filter((x) => x.id !== item.id));
      await supabase.storage.from(BUCKET).remove([item.path]);
    } catch (e) {
      setError(`No se pudo borrar "${item.nombre}": ${e.message}`);
    }
  }, []);

  return { items, urls, cargando, subiendo, error, setError, userId, agregar, quitar, recargar: cargar };
}

function iconoDe(nombre) {
  const ext = (String(nombre).split(".").pop() || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return FileImage;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  return FileText;
}

const RUBROS = [
  { id: "formatos", titulo: "Formatos", ayuda: "Solicitudes, cuestionarios, cartas y demás formatos de trabajo." },
  { id: "publicidad", titulo: "Publicidad", ayuda: "Flyers, imágenes, videos y piezas para compartir con tus clientes." },
];

const btnLinea = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "1px solid var(--line)",
  borderRadius: 10, padding: "7px 11px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", textDecoration: "none",
  cursor: "pointer",
};

function Rubro({ rubro, nombreAgente }) {
  const { items, urls, cargando, subiendo, error, setError, userId, agregar, quitar } = useMaterialCompartido(rubro.id, nombreAgente);
  const [query, setQuery] = useState("");
  const [pendiente, setPendiente] = useState(null);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) => d.nombre.toLowerCase().includes(q) || (d.subido_por_nombre || "").toLowerCase().includes(q));
  }, [items, query]);

  async function subir() {
    if (!pendiente) return;
    const ok = await agregar({ file: pendiente });
    if (ok) setPendiente(null);
  }

  return (
    <div>
      <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>{rubro.ayuda} Lo que subas lo verán y podrán descargar todos los agentes.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{
            flex: 1, background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: 10,
            padding: "10px 12px", fontSize: 13, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {pendiente ? pendiente.name : "Elegir archivo…"}
            <input type="file" style={{ display: "none" }} onChange={(e) => setPendiente(e.target.files[0] || null)} />
          </label>
          <button
            onClick={subir}
            disabled={!pendiente || subiendo}
            style={{
              background: pendiente && !subiendo ? "var(--ink)" : "var(--line)", color: "var(--cream)", border: "none",
              borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <Upload size={14} /> {subiendo ? "Subiendo…" : "Agregar"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#B23A2E", color: "#fff", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#fff" }}>✕</button>
        </div>
      )}

      {items.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre de archivo o agente…"
          style={{
            width: "100%", boxSizing: "border-box", border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)",
            borderRadius: 12, padding: "12px 16px", fontSize: 14, boxShadow: "var(--shadow)", marginBottom: 14,
          }}
        />
      )}

      {cargando && <p style={{ fontSize: 13, color: "var(--stone)", textAlign: "center", padding: "20px 0" }}>Cargando…</p>}
      {!cargando && filtrados.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--stone)", textAlign: "center", padding: "20px 0" }}>
          {items.length === 0 ? `Aún no hay archivos en ${rubro.titulo}. Sube el primero.` : "Sin resultados para tu búsqueda."}
        </p>
      )}

      {filtrados.map((d) => {
        const Icono = iconoDe(d.nombre);
        const url = urls[d.path];
        return (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0, flex: "1 1 220px" }}>
              <div style={{ marginTop: 2, color: "var(--accent, var(--ink))", flexShrink: 0 }}><Icono size={22} /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", overflowWrap: "anywhere" }}>{d.nombre}</div>
                <div style={{ fontSize: 12, color: "var(--stone)" }}>
                  {d.subido_por_nombre ? `Subido por ${d.subido_por_nombre} · ` : ""}{fechaCorta(d.created_at)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              {url ? (
                <>
                  <a href={url} target="_blank" rel="noreferrer" style={btnLinea}><ExternalLink size={14} /> Ver</a>
                  <a href={conDescarga(url, d.nombre)} style={btnLinea}><Download size={14} /> Descargar</a>
                </>
              ) : (
                <span style={{ fontSize: 12, color: "var(--stone)" }}>Preparando enlace…</span>
              )}
              {d.subido_por === userId && (
                <button
                  onClick={() => { if (window.confirm(`¿Borrar "${d.nombre}" para todos los agentes?`)) quitar(d); }}
                  aria-label={`Borrar ${d.nombre}`}
                  style={{ background: "none", border: "1px solid var(--line)", borderRadius: 10, color: "#B23A2E", padding: "7px 10px" }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MaterialApoyo({ nombreAgente = "" }) {
  const [rubro, setRubro] = useState("formatos");
  const actual = RUBROS.find((r) => r.id === rubro) || RUBROS[0];
  return (
    <div>
      <PageHeader eyebrow="Biblioteca compartida" title="Material de apoyo" subtitle="Formatos y publicidad compartidos por todos los agentes: sube, consulta y descarga." />
      <div role="tablist" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {RUBROS.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={rubro === r.id}
            onClick={() => setRubro(r.id)}
            style={{
              flex: 1, padding: "11px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
              border: "1px solid var(--line)",
              background: rubro === r.id ? "var(--ink)" : "#FFFFFF",
              color: rubro === r.id ? "var(--cream)" : "var(--ink)",
            }}
          >
            {r.titulo}
          </button>
        ))}
      </div>
      <Rubro key={actual.id} rubro={actual} nombreAgente={nombreAgente} />
    </div>
  );
}
