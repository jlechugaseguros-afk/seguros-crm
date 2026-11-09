import { supabase } from "./supabaseClient.js";

// Conteo simple de uso: cada vez que el agente abre una pestaña se suma 1 para hoy (tabla uso_pestanas).
// No guarda contenido ni datos de clientes, solo el nombre de la pestaña.
let ultima = "";

export function registrarUsoPestana(pestana) {
  if (!pestana || pestana === ultima) return;
  ultima = pestana;
  // Es solo una estadística: si falla (sin red, etc.) se ignora sin molestar al agente.
  supabase.rpc("registrar_uso_pestana", { p_pestana: String(pestana).slice(0, 40) }).then(() => {}, () => {});
}

// Resumen para el administrador: [{ pestana, aperturas, agentes, ultimo_uso }]
export async function resumenUsoPestanas(dias = 30) {
  const { data, error } = await supabase.rpc("uso_pestanas_resumen", { p_dias: dias });
  if (error) throw error;
  return data || [];
}
