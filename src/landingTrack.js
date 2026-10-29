// Registro de visitas y eventos de la landing (anónimo). Se cuenta una visita por persona cada 30 min.
// No se cuentan las visitas de quien tiene sesión abierta en el CRM (el propio agente).
import { supabase } from "./supabaseClient.js";

const KEY = "jl_visitante";

export function idVisitante() {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 32);
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2, 12);
  }
}

export function fuenteActual() {
  try {
    const q = new URLSearchParams(window.location.search);
    const f = (q.get("f") || q.get("fuente") || q.get("utm_source") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
    if (f) { sessionStorage.setItem("jl_fuente", f); return f; }
    return sessionStorage.getItem("jl_fuente") || "directo";
  } catch {
    return "directo";
  }
}

const REDES = ["instagram", "facebook", "tiktok", "linkedin", "x", "twitter", "youtube", "whatsapp", "ig", "fb"];
export const esRedSocial = (f) => REDES.includes(String(f || "").toLowerCase());

export async function registrarEvento(tipo, pagina) {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return; // es el agente revisando su propia página
    await supabase.rpc("registrar_evento", { p_tipo: tipo, p_visitante: idVisitante(), p_pagina: pagina, p_fuente: fuenteActual() });
  } catch { /* nunca debe romper la página */ }
}
