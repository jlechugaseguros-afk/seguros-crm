import React, { useEffect, useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { supabase } from "./supabaseClient.js";

// Tamaños de pantalla (en píxeles) para que la imagen quede exacta.
const EQUIPOS = [
  { id: "iphone-pro", nombre: "iPhone 15 Pro / 16 / 17", w: 1206, h: 2622 },
  { id: "iphone-std", nombre: "iPhone 13 / 14 / 15 / 16e", w: 1170, h: 2532 },
  { id: "iphone-max", nombre: "iPhone Plus / Pro Max", w: 1290, h: 2796 },
  { id: "ipad-air", nombre: "iPad Air / iPad (vertical)", w: 1640, h: 2360 },
];

export default function FondoPantalla() {
  const [token, setToken] = useState("");
  const [equipo, setEquipo] = useState(EQUIPOS[0].id);
  const [copiado, setCopiado] = useState("");
  const [msg, setMsg] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("fondo_token_obtener");
      if (error) setMsg("No se pudo generar tu enlace. Revisa tu conexión.");
      else setToken(data);
      setCargando(false);
    })();
  }, []);

  async function regenerar() {
    if (!window.confirm("Se creará un enlace nuevo y el anterior dejará de funcionar. Tendrás que actualizar tu atajo. ¿Continuar?")) return;
    const { data, error } = await supabase.rpc("fondo_token_regenerar");
    if (error) setMsg("No se pudo regenerar el enlace.");
    else { setToken(data); setMsg("Enlace nuevo generado ✓"); }
  }

  const eq = EQUIPOS.find((e) => e.id === equipo) || EQUIPOS[0];
  const base = window.location.origin;
  const urlFondo = token ? `${base}/api/fondo?t=${token}&w=${eq.w}&h=${eq.h}` : "";
  const urlDetalle = token ? `${base}/api/detalle?t=${token}` : "";

  async function copiar(texto, id) {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(""), 1800); }
    catch { setMsg("No se pudo copiar. Mantén presionado el enlace para copiarlo."); }
  }

  const caja = { wordBreak: "break-all", fontSize: 12, padding: "8px 10px", borderRadius: 10, background: "rgba(127,140,160,.14)", margin: "6px 0" };

  return (
    <div>
      <p className="aj-lbl">Tu pantalla bloqueada muestra lo siguiente que tienes que hacer, el resumen de hoy, la semana y el ritmo de tu meta, sin montos. Al abrir el detalle ves los montos y puedes llamar o escribir por WhatsApp con un toque.</p>
      {cargando ? <p className="aj-msg">Generando tu enlace…</p> : token && (
        <>
          <label className="aj-fila">
            <span className="aj-et">Mi equipo</span>
            <select value={equipo} onChange={(e) => setEquipo(e.target.value)}>
              {EQUIPOS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>

          <p className="aj-lbl"><b>1. Enlace del fondo</b> (imagen)</p>
          <div style={caja}>{urlFondo}</div>
          <button type="button" className="aj-btn" onClick={() => copiar(urlFondo, "fondo")}>{copiado === "fondo" ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar enlace del fondo</>}</button>

          <p className="aj-lbl" style={{ marginTop: 14 }}><b>2. Enlace del detalle</b> (con montos)</p>
          <div style={caja}>{urlDetalle}</div>
          <button type="button" className="aj-btn" onClick={() => copiar(urlDetalle, "detalle")}>{copiado === "detalle" ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar enlace del detalle</>}</button>

          <p className="aj-lbl" style={{ marginTop: 14 }}><b>3. Mantenerlo al día</b>: en Atajos crea la automatización "Hora del día" tres veces (6:00, 13:00 y 18:00) con las mismas acciones: Obtener contenido de URL con el enlace del fondo y Establecer fondo de pantalla. Para el detalle, crea un atajo con "Abrir URLs" y ponlo como widget de la pantalla bloqueada.</p>
          <p className="aj-lbl">Los enlaces son personales: no los compartas. Si alguien los ve, genera uno nuevo.</p>
          <a className="aj-btn aj-sec-btn" href={urlFondo} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "inline-flex" }}>Ver mi fondo ahora</a>
          <button type="button" className="aj-btn aj-sec-btn" onClick={regenerar} style={{ marginTop: 8 }}><RefreshCw size={14} /> Generar enlace nuevo</button>
        </>
      )}
      {msg && <p className="aj-msg">{msg}</p>}
    </div>
  );
}
