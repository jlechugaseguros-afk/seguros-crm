// Preferencias de apariencia del CRM. Se guardan en este dispositivo (localStorage) y se aplican como variables CSS.
const LS = "jl_ajustes_v1";

export const TEMAS = {
  marino:    { nombre: "Marino y dorado", ink: "#0B2A44", ink2: "#071D31", gold: "#C9971E", goldText: "#A87A12" },
  esmeralda: { nombre: "Esmeralda",       ink: "#0F3D33", ink2: "#0A2B24", gold: "#C9971E", goldText: "#A87A12" },
  violeta:   { nombre: "Violeta",         ink: "#2E1F5E", ink2: "#1E1442", gold: "#E0A93B", goldText: "#A87A12" },
  grafito:   { nombre: "Grafito",         ink: "#1F2933", ink2: "#131A20", gold: "#C9971E", goldText: "#A87A12" },
  vino:      { nombre: "Vino",            ink: "#4A1626", ink2: "#33101A", gold: "#D9A441", goldText: "#A87A12" },
};

export const AJUSTES_BASE = {
  tema: "marino",
  vidrio: 62,       // opacidad de tarjetas y paneles (30–95)
  desenfoque: 22,   // desenfoque del cristal en px (0–40)
  menu: 90,         // opacidad del menú lateral (55–100)
  menuFoto: true,   // foto de fondo en el menú lateral
  fondoAnimado: true,
  animaciones: true,
  texto: 100,       // tamaño de texto en % (90, 100, 110, 120)
};

export function leerAjustes() {
  try { return { ...AJUSTES_BASE, ...(JSON.parse(localStorage.getItem(LS) || "{}")) }; } catch (e) { return { ...AJUSTES_BASE }; }
}

export function guardarAjustes(a) {
  try { localStorage.setItem(LS, JSON.stringify(a)); } catch (e) { /* sin almacenamiento */ }
}

export function aplicarAjustes(a = leerAjustes()) {
  const r = document.documentElement;
  const t = TEMAS[a.tema] || TEMAS.marino;
  r.style.setProperty("--ink", t.ink);
  r.style.setProperty("--ink-2", t.ink2);
  r.style.setProperty("--gold", t.gold);
  r.style.setProperty("--gold-text", t.goldText);
  r.style.setProperty("--gp", String(a.vidrio));
  r.style.setProperty("--gblur", a.desenfoque + "px");
  r.style.setProperty("--side-a", String(a.menu / 100));
  r.style.setProperty("--txt-zoom", String(a.texto / 100));
  r.classList.toggle("aj-sin-foto-menu", !a.menuFoto);
  r.classList.toggle("aj-sin-fondo-animado", !a.fondoAnimado);
  r.classList.toggle("aj-sin-animaciones", !a.animaciones);
}
