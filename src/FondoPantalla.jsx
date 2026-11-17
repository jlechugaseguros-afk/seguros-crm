import React, { useEffect, useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { supabase } from "./supabaseClient.js";

// Tamaños de pantalla (en píxeles) para que la imagen quede exacta.
// y = % de la altura donde empieza el contenido (debajo del reloj de la pantalla bloqueada).
const EQUIPOS = [
  { id: "iphone-pro", nombre: "iPhone 15 Pro / 16 / 17", w: 1206, h: 2622, y: 40 },
  { id: "iphone-std", nombre: "iPhone 13 / 14 / 15 / 16e", w: 1170, h: 2532, y: 40 },
  { id: "iphone-max", nombre: "iPhone Plus / Pro Max", w: 1290, h: 2796, y: 40 },
  { id: "ipad-air", nombre: "iPad Air / iPad (vertical)", w: 1640, h: 2360, y: 40 },
  { id: "and-2400", nombre: "Android 1080 × 2400 (el más común)", w: 1080, h: 2400, y: 32, android: true },
  { id: "and-2340", nombre: "Android 1080 × 2340 (Samsung S / A)", w: 1080, h: 2340, y: 32, android: true },
  { id: "and-3120", nombre: "Android 1440 × 3120 (Samsung Ultra y gama alta)", w: 1440, h: 3120, y: 32, android: true },
  { id: "and-2856", nombre: "Android 1280 × 2856 (Pixel Pro)", w: 1280, h: 2856, y: 32, android: true },
  { id: "and-otro", nombre: "Android: otro tamaño…", w: 1080, h: 2400, y: 32, android: true, otro: true },
];

export default function FondoPantalla() {
  const [token, setToken] = useState("");
  const [equipo, setEquipo] = useState(EQUIPOS[0].id);
  const [pos, setPos] = useState(EQUIPOS[0].y);
  const [otroW, setOtroW] = useState("1080");
  const [otroH, setOtroH] = useState("2400");
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
    if (!window.confirm("Se creará un enlace nuevo y el anterior dejará de funcionar. Tendrás que actualizar tu automatización. ¿Continuar?")) return;
    const { data, error } = await supabase.rpc("fondo_token_regenerar");
    if (error) setMsg("No se pudo regenerar el enlace.");
    else { setToken(data); setMsg("Enlace nuevo generado ✓"); }
  }

  const eq = EQUIPOS.find((e) => e.id === equipo) || EQUIPOS[0];
  const base = window.location.origin;
  const num = (v, min, max, def) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
  const ancho = eq.otro ? num(otroW, 600, 3000, 1080) : eq.w;
  const alto = eq.otro ? num(otroH, 800, 4000, 2400) : eq.h;
  const urlFondo = token ? `${base}/api/fondo?t=${token}&w=${ancho}&h=${alto}&y=${pos}` : "";

  function cambiarEquipo(id) {
    setEquipo(id);
    const nuevo = EQUIPOS.find((e) => e.id === id);
    if (nuevo) setPos(nuevo.y);
  }
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
            <select value={equipo} onChange={(e) => cambiarEquipo(e.target.value)}>
              <optgroup label="iPhone / iPad">
                {EQUIPOS.filter((e) => !e.android).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </optgroup>
              <optgroup label="Android">
                {EQUIPOS.filter((e) => e.android).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </optgroup>
            </select>
          </label>
          {eq.otro && (
            <>
              <div style={{ display: "flex", gap: 8, margin: "6px 0" }}>
                <input inputMode="numeric" value={otroW} onChange={(e) => setOtroW(e.target.value.replace(/\D/g, ""))} placeholder="Ancho" aria-label="Ancho en píxeles" style={{ flex: 1 }} />
                <input inputMode="numeric" value={otroH} onChange={(e) => setOtroH(e.target.value.replace(/\D/g, ""))} placeholder="Alto" aria-label="Alto en píxeles" style={{ flex: 1 }} />
              </div>
              <p className="aj-lbl">Escribe la resolución de tu pantalla en píxeles (ancho × alto). La ves en Ajustes del teléfono → Pantalla, o en las propiedades de una captura de pantalla.</p>
            </>
          )}
          <label className="aj-fila" style={{ display: "block", marginTop: 8 }}>
            <span className="aj-et">Dónde empieza el contenido: {pos}% desde arriba</span>
            <input type="range" min="15" max="55" step="1" value={pos} onChange={(e) => setPos(Number(e.target.value))} style={{ width: "100%" }} />
          </label>
          <p className="aj-lbl">Súbelo si tu reloj queda muy pegado arriba y sobra espacio; bájalo si el contenido tapa el reloj. En Android las notificaciones aparecen debajo del reloj y pueden cubrir parte del fondo: prueba con "Ver mi fondo ahora" y ajusta.</p>

          <p className="aj-lbl"><b>1. Enlace del fondo</b> (imagen)</p>
          <div style={caja}>{urlFondo}</div>
          <button type="button" className="aj-btn" onClick={() => copiar(urlFondo, "fondo")}>{copiado === "fondo" ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar enlace del fondo</>}</button>

          <p className="aj-lbl" style={{ marginTop: 14 }}><b>2. Enlace del detalle</b> (con montos)</p>
          <div style={caja}>{urlDetalle}</div>
          <button type="button" className="aj-btn" onClick={() => copiar(urlDetalle, "detalle")}>{copiado === "detalle" ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar enlace del detalle</>}</button>

          {eq.android ? (
            <>
              <p className="aj-lbl" style={{ marginTop: 14 }}><b>3. Mantenerlo al día (Android)</b>: instala la app gratuita <b>MacroDroid</b> (Play Store) y crea una macro:</p>
              <ol className="aj-lbl" style={{ paddingLeft: 18, margin: "4px 0" }}>
                <li>Disparador: <b>Día/hora</b> a las 6:00; agrega otros dos disparadores a las 13:00 y 18:00.</li>
                <li>Acción: <b>Solicitud HTTP</b> (GET) con el enlace del fondo, activando "Guardar respuesta en archivo" (por ejemplo en Descargas, fondo.png).</li>
                <li>Acción: <b>Establecer fondo de pantalla</b>, elige ese archivo y marca <b>Pantalla de bloqueo</b>.</li>
                <li>En los ajustes de Android, quita la optimización de batería a MacroDroid para que corra a su hora.</li>
              </ol>
              <p className="aj-lbl">Para el detalle: abre el enlace del detalle en Chrome, toca ⋮ → <b>Agregar a la pantalla principal</b>, y tendrás un ícono que lo abre con un toque.</p>
            </>
          ) : (
            <p className="aj-lbl" style={{ marginTop: 14 }}><b>3. Mantenerlo al día</b>: en Atajos crea la automatización "Hora del día" tres veces (6:00, 13:00 y 18:00) con las mismas acciones: Obtener contenido de URL con el enlace del fondo y Establecer fondo de pantalla. Para el detalle, crea un atajo con "Abrir URLs" y ponlo como widget de la pantalla bloqueada.</p>
          )}
          <p className="aj-lbl">Los enlaces son personales: no los compartas. Si alguien los ve, genera uno nuevo.</p>
          <a className="aj-btn aj-sec-btn" href={urlFondo} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "inline-flex" }}>Ver mi fondo ahora</a>
          <button type="button" className="aj-btn aj-sec-btn" onClick={regenerar} style={{ marginTop: 8 }}><RefreshCw size={14} /> Generar enlace nuevo</button>
        </>
      )}
      {msg && <p className="aj-msg">{msg}</p>}
    </div>
  );
}
