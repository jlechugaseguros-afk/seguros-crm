import React, { useRef, useState } from "react";
import { leerArchivo, analizarCartera, descargarPlantilla } from "./importarCartera.js";

const btnBase = { borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" };

function Dato({ n, label, tono }) {
  return (
    <div style={{ flex: "1 1 120px", background: "var(--cream)", borderRadius: 12, padding: "10px 12px" }}>
      <div className="serif" style={{ fontSize: 24, color: tono || "var(--ink)", lineHeight: 1.1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function ImportarCartera({ clients, opciones, onApply, onClose }) {
  const inputRef = useRef(null);
  const [estado, setEstado] = useState("inicio"); // inicio | leyendo | revisar | listo
  const [archivo, setArchivo] = useState("");
  const [error, setError] = useState("");
  const [res, setRes] = useState(null);
  const [resumenFinal, setResumenFinal] = useState("");

  async function elegir(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setError(""); setRes(null); setArchivo(file.name); setEstado("leyendo");
    try {
      const wb = await leerArchivo(file);
      const r = analizarCartera(wb, clients, opciones);
      if (r.error) { setError(r.error); setEstado("inicio"); return; }
      setRes(r); setEstado("revisar");
    } catch (err) {
      setError("No pude leer el archivo. Verifica que sea un Excel (.xlsx, .xls) o un CSV.");
      setEstado("inicio");
    }
  }

  function confirmar() {
    onApply(res.aplicar);
    const partes = [];
    if (res.clientesNuevos) partes.push(`${res.clientesNuevos} cliente${res.clientesNuevos === 1 ? "" : "s"} nuevo${res.clientesNuevos === 1 ? "" : "s"}`);
    if (res.polizasNuevas) partes.push(`${res.polizasNuevas} póliza${res.polizasNuevas === 1 ? "" : "s"}`);
    setResumenFinal(`Se importaron ${partes.join(" y ")}.`);
    setEstado("listo");
  }

  return (
    <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(27,42,65,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 16 }}>
      <div className="panel" style={{ width: "100%", maxWidth: 520, maxHeight: "92dvh", overflowY: "auto", padding: 20, background: "var(--surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 className="serif" style={{ fontSize: 22, margin: 0 }}>Importar cartera</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", fontSize: 22, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {(estado === "inicio" || estado === "leyendo") && (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Sube un Excel (.xlsx) o CSV con tus clientes y pólizas, una fila por póliza. También sirve el Excel que exporta este CRM.
              Si el cliente ya existe, solo se agregan sus pólizas nuevas; no se duplica nada.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => inputRef.current && inputRef.current.click()} disabled={estado === "leyendo"} className="lift"
                style={{ ...btnBase, background: "var(--gold)", color: "#fff", border: "none", boxShadow: "0 6px 16px -6px rgba(201,151,30,.6)" }}>
                {estado === "leyendo" ? "Leyendo…" : "Elegir archivo"}
              </button>
              <button onClick={() => descargarPlantilla(opciones)} style={{ ...btnBase, background: "none", color: "var(--ink)", border: "1px solid var(--line)" }}>
                Descargar plantilla
              </button>
            </div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.txt,text/csv" onChange={elegir} style={{ display: "none" }} />
            {error && <p style={{ color: "#B23A2E", fontSize: 13, marginTop: 14 }}>{error}</p>}
          </>
        )}

        {estado === "revisar" && res && (
          <>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px" }}>Archivo: <b style={{ color: "var(--ink)" }}>{archivo}</b>. Revisa antes de importar; todavía no se guardó nada.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <Dato n={res.clientesNuevos} label="clientes nuevos" tono="var(--emerald)" />
              <Dato n={res.polizasNuevas} label="pólizas por agregar" tono="var(--emerald)" />
              <Dato n={res.clientesExistentes} label="clientes ya existentes (se les agregan pólizas)" />
              <Dato n={res.polizasDuplicadas} label="pólizas repetidas (se omiten)" />
            </div>

            {res.vista.length > 0 && (
              <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
                {res.vista.map((v, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 12px", fontSize: 13, borderTop: i ? "1px solid var(--line)" : "none" }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.nombre}</span>
                    <span style={{ color: "var(--muted)", flex: "none" }}>{v.polizas} póliza{v.polizas === 1 ? "" : "s"}</span>
                  </div>
                ))}
                {res.clientesNuevos > res.vista.length && (
                  <div style={{ padding: "7px 12px", fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--line)", background: "var(--cream)" }}>
                    y {res.clientesNuevos - res.vista.length} más…
                  </div>
                )}
              </div>
            )}

            {(res.advertencias.length > 0 || res.omitidas.length > 0) && (
              <div style={{ background: "var(--gold-soft)", borderRadius: 12, padding: "10px 12px", fontSize: 12.5, color: "#5A4300", marginBottom: 12, lineHeight: 1.5 }}>
                {res.advertencias.map((a, i) => <div key={i}>• {a}</div>)}
                {res.omitidas.length > 0 && (
                  <div>• {res.omitidas.length} fila{res.omitidas.length === 1 ? "" : "s"} omitida{res.omitidas.length === 1 ? "" : "s"} por no tener nombre (fila{res.omitidas.length === 1 ? "" : "s"} {res.omitidas.slice(0, 6).map((o) => o.fila).join(", ")}{res.omitidas.length > 6 ? "…" : ""}).</div>
                )}
              </div>
            )}

            {!res.hayAlgo && <p style={{ fontSize: 13, color: "var(--muted)" }}>No hay nada nuevo que importar: todo lo del archivo ya está en tu cartera.</p>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 6 }}>
              <button onClick={() => { setEstado("inicio"); setRes(null); }} style={{ ...btnBase, background: "none", color: "var(--ink)", border: "1px solid var(--line)" }}>Elegir otro archivo</button>
              <button onClick={confirmar} disabled={!res.hayAlgo} className="lift"
                style={{ ...btnBase, background: res.hayAlgo ? "var(--gold)" : "var(--line)", color: "#fff", border: "none", cursor: res.hayAlgo ? "pointer" : "default" }}>
                Importar
              </button>
            </div>
          </>
        )}

        {estado === "listo" && (
          <>
            <p style={{ fontSize: 14, color: "var(--emerald)", fontWeight: 600, margin: "10px 0 6px" }}>✓ {resumenFinal}</p>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>Ya aparecen en Clientes. Los recordatorios de renovación y pago se calculan con las fechas que importaste.</p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={onClose} className="lift" style={{ ...btnBase, background: "var(--ink)", color: "#fff", border: "none" }}>Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
