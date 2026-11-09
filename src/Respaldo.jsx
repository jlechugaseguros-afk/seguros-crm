import React, { useEffect, useState, useCallback } from "react";
import { Download, Database, RotateCcw, FileSpreadsheet } from "lucide-react";
import { leerTodo, crearRespaldo, listarRespaldos, leerRespaldo, restaurarRespaldo, descargarJson, descargarExcel } from "./respaldo.js";

const fechaHora = (iso) => {
  try { return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
};

// Sección de Ajustes: descargar todo, respaldar ahora y restaurar una copia anterior.
export default function Respaldo() {
  const [lista, setLista] = useState(null);
  const [msg, setMsg] = useState({ t: "", ok: true });
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try { setLista(await listarRespaldos()); } catch { setLista([]); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function correr(fn, okTexto) {
    setOcupado(true); setMsg({ t: "", ok: true });
    try { await fn(); if (okTexto) setMsg({ t: okTexto, ok: true }); }
    catch (e) { setMsg({ t: e.message || "No se pudo completar.", ok: false }); }
    setOcupado(false);
  }

  const descargarTodo = () => correr(async () => descargarJson(await leerTodo()), "Descarga lista ✓ Guárdala en un lugar seguro.");
  const descargarCartera = () => correr(async () => descargarExcel(await leerTodo()), "Excel descargado ✓");
  const respaldarAhora = () => correr(async () => {
    const r = await crearRespaldo("manual");
    if (!r) throw new Error("Aún no hay datos que respaldar.");
    await cargar();
  }, "Respaldo guardado ✓");
  const bajar = (r) => correr(async () => {
    const { datos, created_at } = await leerRespaldo(r.id);
    descargarJson(datos, String(created_at).slice(0, 10));
  });
  const restaurar = (r) => {
    if (!window.confirm(`Se regresará tu CRM al respaldo del ${fechaHora(r.created_at)}. Lo que hayas capturado después se reemplaza (antes guardo una copia de tu estado actual por si necesitas deshacerlo). ¿Continuar?`)) return;
    correr(async () => {
      await restaurarRespaldo(r.id);
      window.location.reload();
    });
  };

  return (
    <>
      <p className="aj-lbl">Tu información se respalda sola cada día (se conservan las últimas 14 copias). También puedes llevarte una copia contigo.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="aj-btn" disabled={ocupado} onClick={descargarTodo}><Download size={14} /> Descargar todo</button>
        <button type="button" className="aj-btn aj-sec-btn" disabled={ocupado} onClick={descargarCartera}><FileSpreadsheet size={14} /> Cartera en Excel</button>
        <button type="button" className="aj-btn aj-sec-btn" disabled={ocupado} onClick={respaldarAhora}><Database size={14} /> Respaldar ahora</button>
      </div>
      {msg.t && <p className={"aj-msg" + (msg.ok ? "" : " aj-err")}>{msg.t}</p>}

      <p className="aj-lbl" style={{ marginTop: 14 }}>Copias guardadas</p>
      {lista === null && <p className="aj-msg">Cargando…</p>}
      {lista && lista.length === 0 && <p className="aj-msg">Todavía no hay copias. La primera se crea sola al usar el CRM.</p>}
      {lista && lista.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>{fechaHora(r.created_at)}</b>
            <small style={{ display: "block", color: "var(--stone)" }}>{r.origen === "manual" ? "Manual" : "Automático"} · {r.claves} secciones</small>
          </span>
          <button type="button" className="aj-btn aj-sec-btn" disabled={ocupado} onClick={() => bajar(r)} aria-label="Descargar esta copia"><Download size={14} /></button>
          <button type="button" className="aj-btn aj-sec-btn" disabled={ocupado} onClick={() => restaurar(r)}><RotateCcw size={14} /> Restaurar</button>
        </div>
      ))}
    </>
  );
}
