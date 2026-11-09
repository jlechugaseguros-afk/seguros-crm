import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient.js";

// Respaldo de los datos del agente (tabla app_data) y copias automáticas diarias (tabla respaldos).

const HORAS_ENTRE_AUTOMATICOS = 20;
const RESPALDOS_A_CONSERVAR = 14;
// Claves que no vale la pena respaldar (solo sirven para el día en curso).
const CLAVES_IGNORADAS = new Set(["notifsVistas"]);

async function usuarioId() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) throw new Error("Sin sesión activa.");
  return data.user.id;
}

// Lee todo lo que el agente tiene guardado: { clients: [...], prospectos: [...], ... }
export async function leerTodo() {
  const id = await usuarioId();
  const { data, error } = await supabase.from("app_data").select("key,value").eq("agent_id", id);
  if (error) throw error;
  const datos = {};
  for (const fila of data || []) if (!CLAVES_IGNORADAS.has(fila.key)) datos[fila.key] = fila.value;
  return datos;
}

export async function crearRespaldo(origen = "automatico") {
  const datos = await leerTodo();
  const claves = Object.keys(datos).length;
  if (!claves) return null;
  const { data, error } = await supabase.from("respaldos").insert({ origen, claves, datos }).select("id,created_at").single();
  if (error) throw error;
  await supabase.rpc("respaldos_limpiar", { p_conservar: RESPALDOS_A_CONSERVAR });
  return data;
}

// Una copia por día como máximo, sin que el agente tenga que hacer nada.
export async function respaldoAutomaticoSiToca() {
  try {
    const id = await usuarioId();
    const { data } = await supabase
      .from("respaldos").select("created_at").eq("agent_id", id).order("created_at", { ascending: false }).limit(1);
    const ultimo = data && data[0] ? new Date(data[0].created_at).getTime() : 0;
    if (Date.now() - ultimo < HORAS_ENTRE_AUTOMATICOS * 3600 * 1000) return false;
    return !!(await crearRespaldo("automatico"));
  } catch {
    return false;
  }
}

export async function listarRespaldos() {
  const id = await usuarioId();
  const { data, error } = await supabase
    .from("respaldos").select("id,created_at,origen,claves").eq("agent_id", id).order("created_at", { ascending: false }).limit(RESPALDOS_A_CONSERVAR);
  if (error) throw error;
  return data || [];
}

export async function leerRespaldo(idRespaldo) {
  const id = await usuarioId();
  const { data, error } = await supabase.from("respaldos").select("datos,created_at").eq("agent_id", id).eq("id", idRespaldo).single();
  if (error) throw error;
  return data;
}

// Devuelve el CRM al estado de un respaldo. Antes guarda una copia manual del estado actual por si hay que deshacer.
export async function restaurarRespaldo(idRespaldo) {
  const id = await usuarioId();
  const { datos } = await leerRespaldo(idRespaldo);
  await crearRespaldo("manual");
  const filas = Object.entries(datos || {}).map(([key, value]) => ({ agent_id: id, key, value, updated_at: new Date().toISOString() }));
  if (!filas.length) throw new Error("El respaldo está vacío.");
  const { error } = await supabase.from("app_data").upsert(filas, { onConflict: "agent_id,key" });
  if (error) throw error;
  return filas.length;
}

const hoy = () => new Date().toISOString().slice(0, 10);

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function descargarJson(datos, fecha = hoy()) {
  const contenido = { app: "J L CRM", generado: new Date().toISOString(), datos };
  descargar(new Blob([JSON.stringify(contenido, null, 2)], { type: "application/json" }), `respaldo-crm-${fecha}.json`);
}

const plano = (obj) => {
  const fila = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v == null) fila[k] = "";
    else if (typeof v === "object") { if (v.name || v.path) fila[k] = v.name || v.path; else if (!Array.isArray(v)) fila[k] = JSON.stringify(v); }
    else fila[k] = v;
  }
  return fila;
};

// Excel legible con clientes, pólizas y prospectos (para revisar o guardar en tu computadora).
export function descargarExcel(datos, fecha = hoy()) {
  const wb = XLSX.utils.book_new();
  const clientes = Array.isArray(datos.clients) ? datos.clients : [];
  const polizas = clientes.flatMap((c) => (c.polizas || []).map((p) => ({ Cliente: c.nombre, Teléfono: c.telefono, ...plano(p) })));
  const prospectos = Array.isArray(datos.prospectos) ? datos.prospectos : [];
  const hojas = [
    ["Clientes", clientes.map(plano)],
    ["Pólizas", polizas],
    ["Prospectos", prospectos.map(plano)],
  ];
  for (const [nombre, filas] of hojas) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas.length ? filas : [{ Sin_datos: "" }]), nombre);
  }
  XLSX.writeFile(wb, `mi-cartera-${fecha}.xlsx`);
}
