// Sincronización con Google Calendar desde el navegador (Google Identity Services, sin servidor).
// Requiere VITE_GOOGLE_CLIENT_ID (ID de cliente OAuth tipo "Aplicación web" con la API de Calendar activada).
// El permiso se pide una vez; el token dura ~1 hora y se renueva solo al guardar la siguiente actividad.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const LS_ACTIVO = "gcalActivo";
const TZ = "America/Mexico_City";

let token = null;
let tokenExp = 0;
let gisPromise = null;

export const gcalDisponible = () => Boolean(CLIENT_ID);
export const gcalActivo = () => {
  try { return localStorage.getItem(LS_ACTIVO) === "1"; } catch { return false; }
};
export function gcalDesactivar() {
  try { localStorage.removeItem(LS_ACTIVO); } catch { /* sin almacenamiento */ }
  token = null; tokenExp = 0;
}

function cargarGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => ok();
      s.onerror = () => { gisPromise = null; fail(new Error("No se pudo cargar Google")); };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

// Debe llamarse desde un clic del usuario la primera vez (el navegador bloquea la ventana si no).
async function obtenerToken(interactivo) {
  if (token && Date.now() < tokenExp - 60000) return token;
  await cargarGIS();
  return new Promise((ok, fail) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) return fail(new Error(r.error || "Sin permiso"));
        token = r.access_token;
        tokenExp = Date.now() + (Number(r.expires_in) || 3600) * 1000;
        ok(token);
      },
      error_callback: (e) => fail(new Error(e?.type || "Cancelado")),
    });
    client.requestAccessToken({ prompt: interactivo ? "consent" : "" });
  });
}

export async function gcalConectar() {
  if (!CLIENT_ID) throw new Error("Falta configurar VITE_GOOGLE_CLIENT_ID");
  await obtenerToken(true);
  try { localStorage.setItem(LS_ACTIVO, "1"); } catch { /* sin almacenamiento */ }
}

function sumarMinutos(fecha, hora, min) {
  const d = new Date(`${fecha}T${hora}:00`);
  d.setMinutes(d.getMinutes() + min);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function cuerpoEvento(a, nombreCliente) {
  const titulo = `${a.tipo || "Actividad"}: ${a.descripcion}${nombreCliente ? ` — ${nombreCliente}` : ""}`;
  const base = { summary: titulo, description: "Creado desde J L CRM", reminders: { useDefault: true } };
  if (a.hora) {
    return {
      ...base,
      start: { dateTime: `${a.fecha}T${a.hora}:00`, timeZone: TZ },
      end: { dateTime: sumarMinutos(a.fecha, a.hora, a.duracionMin || 60), timeZone: TZ },
    };
  }
  const sig = new Date(`${a.fecha}T12:00:00`);
  sig.setDate(sig.getDate() + 1);
  const p = (n) => String(n).padStart(2, "0");
  return { ...base, start: { date: a.fecha }, end: { date: `${sig.getFullYear()}-${p(sig.getMonth() + 1)}-${p(sig.getDate())}` } };
}

async function llamar(metodo, ruta, cuerpo) {
  const t = await obtenerToken(false);
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (r.status === 401) { token = null; throw new Error("Sesión de Google vencida"); }
  if (!r.ok && !(metodo === "DELETE" && (r.status === 404 || r.status === 410))) throw new Error(`Google Calendar ${r.status}`);
  return metodo === "DELETE" ? null : r.json();
}

// Crea el evento y devuelve su id (o null si la sincronización no está activa o falló).
export async function gcalCrear(actividad, nombreCliente) {
  if (!CLIENT_ID || !gcalActivo()) return null;
  try {
    const ev = await llamar("POST", "", cuerpoEvento(actividad, nombreCliente));
    return ev?.id || null;
  } catch { return null; }
}

export async function gcalBorrar(eventId) {
  if (!CLIENT_ID || !gcalActivo() || !eventId) return;
  try { await llamar("DELETE", `/${encodeURIComponent(eventId)}`); } catch { /* ya no existe o sin sesión */ }
}

// Enlace para agregar a mano cuando la sincronización no está conectada.
export function gcalLinkManual(a, nombreCliente) {
  const ev = cuerpoEvento(a, nombreCliente);
  const f = (x) => x.replace(/[-:]/g, "");
  const fechas = a.hora
    ? `${f(ev.start.dateTime)}/${f(ev.end.dateTime)}`
    : `${ev.start.date.replace(/-/g, "")}/${ev.end.date.replace(/-/g, "")}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: ev.summary, dates: fechas, details: ev.description, ctz: TZ });
  return `https://calendar.google.com/calendar/render?${q}`;
}
