// Esquema de comisiones por ramo y subramo (tabla vigente desde el 2026-10-26).
// El porcentaje se aplica sobre la prima anual de la póliza. Cada subramo se puede ajustar en Comisiones.

export const CATALOGO_COMISIONES = [
  { familia: "Daños", subramo: "Negocio Protegido", pct: 14 },
  { familia: "Daños", subramo: "Responsabilidad Civil", pct: 6 },
  { familia: "Daños", subramo: "RC Mercancía de transportes de carga", pct: 6 },
  { familia: "Daños", subramo: "RC Profesional", pct: 14 },
  { familia: "Daños", subramo: "Hogar Familiar", pct: 14 },
  { familia: "Daños", subramo: "Mascotas", pct: 9 },

  { familia: "Salud", subramo: "Gastos Médicos Ind", pct: 11 },
  { familia: "Salud", subramo: "Gmm ExCol Bimbo", pct: 11 },
  { familia: "Salud", subramo: "Accidentes Individuales", pct: 11 },
  { familia: "Salud", subramo: "Indemnizatorio", pct: 10 },
  { familia: "Salud", subramo: "Viajero", pct: 20 },
  { familia: "Salud", subramo: "Gastos Médicos Familiar", pct: 11 },

  { familia: "Vehículos", subramo: "Automóviles Individuales", pct: 10 },
  { familia: "Vehículos", subramo: "Salvamento/Decreto", pct: 10 },
  { familia: "Vehículos", subramo: "Chofer Privado", pct: 10 },
  { familia: "Vehículos", subramo: "Motocicletas", pct: 8 },
  { familia: "Vehículos", subramo: "Camiones Individuales", pct: 8 },
  { familia: "Vehículos", subramo: "Flotilla", pct: 5 },

  { familia: "Vida", subramo: "Vida Individual", pct: 22 },
  { familia: "Vida", subramo: "Educación", pct: 22 },
];

export const FAMILIAS = ["Daños", "Salud", "Vehículos", "Vida"];
export const GRUPO_OTROS = "Otros";
export const GRUPOS = [...FAMILIAS, GRUPO_OTROS];

// Productos que no están en la tabla (se capturan con su porcentaje manual).
export const RAMO_PPR = "Plan Personal de Retiro (PPR)";
export const EXTRAS_MANUALES = [RAMO_PPR, "Otro"];

export const PCT_POR_SUBRAMO = Object.fromEntries(CATALOGO_COMISIONES.map((c) => [c.subramo, c.pct]));
export const FAMILIA_DE_SUBRAMO = Object.fromEntries(CATALOGO_COMISIONES.map((c) => [c.subramo, c.familia]));
export const SUBRAMOS_POR_FAMILIA = Object.fromEntries(FAMILIAS.map((f) => [f, CATALOGO_COMISIONES.filter((c) => c.familia === f).map((c) => c.subramo)]));

// Porcentajes iniciales: la tabla completa más los dos conceptos manuales.
export const PORCENTAJES_INICIALES = { ...PCT_POR_SUBRAMO, [RAMO_PPR]: 0, Otro: 0 };

// Los ramos que ya existían siguen igual (el portal y la calculadora de deducible los usan);
// cada uno apunta a su familia y a su subramo más común.
const FAMILIA_DE_RAMO = { Autos: "Vehículos", Vida: "Vida", GMM: "Salud", Salud: "Salud", Mascotas: "Daños", Hogar: "Daños", "Daños": "Daños" };
export const SUBRAMO_POR_DEFECTO = {
  Autos: "Automóviles Individuales",
  Vida: "Vida Individual",
  GMM: "Gastos Médicos Ind",
  Mascotas: "Mascotas",
  Hogar: "Hogar Familiar",
};

// Subramos que se ofrecen al elegir cada ramo.
export function subramosDeRamo(ramo) {
  if (ramo === "Autos") return SUBRAMOS_POR_FAMILIA["Vehículos"];
  if (ramo === "Vida") return SUBRAMOS_POR_FAMILIA.Vida;
  if (ramo === "GMM" || ramo === "Salud") return SUBRAMOS_POR_FAMILIA.Salud;
  if (ramo === "Daños") return SUBRAMOS_POR_FAMILIA["Daños"];
  if (ramo === "Mascotas") return ["Mascotas"];
  if (ramo === "Hogar") return ["Hogar Familiar"];
  return [];
}

// Dice a qué grupo, subramo y porcentaje corresponde una póliza.
// Las pólizas anteriores (sin subramo) toman el subramo más común de su ramo.
export function resolverComision(poliza, porcentajes) {
  const pcts = porcentajes || {};
  const elegido = poliza && poliza.subramo && FAMILIA_DE_SUBRAMO[poliza.subramo] ? poliza.subramo : "";
  const subramo = elegido || SUBRAMO_POR_DEFECTO[poliza && poliza.ramo] || "";
  if (subramo) {
    const guardado = pcts[subramo];
    const pct = guardado === undefined || guardado === null ? PCT_POR_SUBRAMO[subramo] : Number(guardado) || 0;
    return { familia: FAMILIA_DE_SUBRAMO[subramo], subramo, pct, sinSubramo: false };
  }
  const ramo = (poliza && poliza.ramo) || "Otro";
  const clave = ramo === RAMO_PPR ? RAMO_PPR : "Otro";
  const familia = FAMILIA_DE_RAMO[ramo] || GRUPO_OTROS;
  return {
    familia,
    subramo: ramo,
    pct: Number(pcts[clave]) || 0,
    sinSubramo: familia !== GRUPO_OTROS,
  };
}

export function comisionDePoliza(poliza, porcentajes) {
  const prima = Number(poliza && poliza.primaAnual) || 0;
  return (prima * resolverComision(poliza, porcentajes).pct) / 100;
}

// Las metas ahora se capturan por grupo (Daños, Salud, Vehículos, Vida, Otros).
// Esto traslada las metas que ya estaban guardadas por ramo.
export function migrarMetas(guardadas) {
  const g = guardadas || {};
  const vacio = { metaPolizas: "", metaPrimaNeta: "" };
  const primeraConDato = (...claves) => {
    for (const k of claves) {
      const m = g[k];
      if (m && (m.metaPolizas || m.metaPrimaNeta)) return m;
    }
    return vacio;
  };
  return {
    "Daños": g["Daños"] || primeraConDato("Hogar", "Mascotas"),
    Salud: g.Salud || primeraConDato("GMM"),
    "Vehículos": g["Vehículos"] || primeraConDato("Autos"),
    Vida: g.Vida || vacio,
    Otros: g.Otros || primeraConDato(RAMO_PPR),
  };
}

export function metasIniciales() {
  return Object.fromEntries(GRUPOS.map((x) => [x, { metaPolizas: "", metaPrimaNeta: "" }]));
}

export const TODOS_LOS_SUBRAMOS = CATALOGO_COMISIONES.map((c) => c.subramo);

// Ramo (de la lista que ya usa el CRM) que corresponde a un subramo, para cuando el Excel solo trae el subramo.
export function ramoDeSubramo(subramo) {
  const familia = FAMILIA_DE_SUBRAMO[subramo];
  if (familia === "Vehículos") return "Autos";
  if (familia === "Vida") return "Vida";
  if (familia === "Salud") return /^(Gastos Médicos|Gmm)/.test(subramo) ? "GMM" : "Salud";
  if (subramo === "Mascotas") return "Mascotas";
  if (subramo === "Hogar Familiar") return "Hogar";
  return "Daños";
}
