// Motor del "Diagnóstico Patrimonial" público (landing). Preguntas, puntaje y resultado.
// Es una orientación general: no es una cotización ni una recomendación de producto específico.

export const PREGUNTAS = [
  {
    id: "edad", t: "¿En qué rango de edad estás?", s: "Con esto calculamos cuánto tiempo tienes para construir tu protección.",
    op: [["18-29", "18 a 29 años"], ["30-39", "30 a 39 años"], ["40-49", "40 a 49 años"], ["50-59", "50 a 59 años"], ["60+", "60 años o más"]],
  },
  {
    id: "dep", t: "¿Quién depende de tus ingresos?", s: "Las personas que cuentan contigo definen cuánta protección necesitas.",
    op: [["nadie", "Solo yo"], ["pareja", "Mi pareja"], ["hijos", "Mis hijos (con o sin pareja)"], ["otros", "Hijos y otros familiares (padres, hermanos…)"]],
  },
  {
    id: "trab", t: "¿Cómo generas tus ingresos?", s: "Tu tipo de trabajo cambia las prestaciones y la pensión con las que cuentas.",
    op: [["imss", "Empleado con IMSS"], ["sinimss", "Empleado sin IMSS"], ["indep", "Independiente / emprendedor"], ["empresario", "Empresario o dueño de negocio"]],
  },
  {
    id: "vida", t: "¿Tienes seguro de vida?", s: "Es lo que sostiene a tu familia si tú faltas.",
    op: [["no", "No tengo"], ["trabajo", "Solo el de mi trabajo"], ["propio", "Sí, uno propio"], ["nose", "No estoy seguro"]],
  },
  {
    id: "gmm", t: "¿Cómo cubres una enfermedad o un accidente grave?", s: "Una hospitalización mayor puede costar más que años de ahorro.",
    op: [["no", "No tengo cobertura"], ["imss", "Solo IMSS / ISSSTE"], ["trabajo", "Gastos médicos de mi trabajo"], ["propio", "Gastos médicos mayores propios"]],
  },
  {
    id: "emer", t: "Si hoy dejaras de recibir ingresos, ¿cuánto aguantarías con tus ahorros?", s: "Tu fondo de emergencia es tu primera línea de defensa.",
    op: [["ninguno", "Menos de 1 mes"], ["1a2", "1 a 2 meses"], ["3a5", "3 a 5 meses"], ["6mas", "6 meses o más"]],
  },
  {
    id: "ret", t: "¿Cómo estás preparando tu retiro?", s: "La pensión del IMSS o la Afore, por sí solas, rara vez alcanzan para mantener tu nivel de vida.",
    op: [["nada", "Todavía no estoy ahorrando para eso"], ["afore", "Solo mi Afore / pensión"], ["ppr", "Afore + un plan de retiro o ahorro propio"], ["nose", "No lo sé"]],
  },
  {
    id: "meta", t: "¿Qué es lo más importante que quieres lograr?", s: "Elige tu prioridad principal. Con eso enfocamos tu plan.",
    op: [["familia", "Proteger a mi familia pase lo que pase"], ["edu", "Pagar la educación de mis hijos"], ["retiro", "Retirarme con tranquilidad"], ["patrimonio", "Hacer crecer y heredar mi patrimonio"], ["salud", "Cuidar mi salud sin descapitalizarme"]],
  },
];

const META_TXT = {
  familia: "proteger a tu familia", edu: "la educación de tus hijos", retiro: "tu retiro",
  patrimonio: "hacer crecer y heredar tu patrimonio", salud: "cuidar tu salud sin descapitalizarte",
};

export const AREAS = [
  { id: "vida", nombre: "Protección familiar", corto: "Vida" },
  { id: "salud", nombre: "Salud", corto: "Salud" },
  { id: "emer", nombre: "Fondo de emergencia", corto: "Emergencia" },
  { id: "ret", nombre: "Retiro", corto: "Retiro" },
];

export function colorPuntaje(p) {
  return p >= 75 ? "#1E5C4C" : p >= 50 ? "#C9971E" : p >= 30 ? "#E07B2A" : "#B23A2E";
}
export function nivelPuntaje(p) {
  return p >= 80 ? "Bien protegido" : p >= 60 ? "Buena base" : p >= 35 ? "Protección parcial" : "Alta exposición";
}

const dependientes = (r) => r.dep && r.dep !== "nadie";

function puntajeArea(id, r) {
  const dep = dependientes(r);
  if (id === "vida") {
    const t = dep ? { no: 5, trabajo: 35, propio: 85, nose: 15 } : { no: 40, trabajo: 60, propio: 90, nose: 35 };
    return t[r.vida] ?? 10;
  }
  if (id === "salud") return ({ no: 10, imss: 40, trabajo: 65, propio: 90 })[r.gmm] ?? 10;
  if (id === "emer") return ({ ninguno: 5, "1a2": 35, "3a5": 70, "6mas": 100 })[r.emer] ?? 5;
  let p = ({ nada: 5, afore: 35, ppr: 85, nose: 15 })[r.ret] ?? 10;
  if (r.edad === "50-59" || r.edad === "60+") p = Math.max(0, p - 10);
  if (r.trab === "indep" || r.trab === "empresario" || r.trab === "sinimss") p = Math.max(0, p - (r.ret === "afore" ? 10 : 0));
  return p;
}

// Meses que el hogar sostendría su nivel de vida si faltara el ingreso principal.
function mesesColchon(r) {
  const base = ({ ninguno: 0.5, "1a2": 1.5, "3a5": 4, "6mas": 8 })[r.emer] ?? 0.5;
  const dep = dependientes(r);
  const bono = dep ? ({ no: 0, trabajo: 6, propio: 24, nose: 0 })[r.vida] ?? 0 : 0;
  return base + bono;
}

const ACCION = {
  vida: {
    t: "Protege el ingreso de tu familia",
    conDep: "Si hoy faltaras, tu familia tendría poco tiempo para reacomodarse. Un seguro de vida bien dimensionado cubre gastos, deudas y la educación de tus hijos.",
    sinDep: "Aunque nadie dependa de ti hoy, un seguro de vida temporal es barato a tu edad y cubre deudas y gastos finales.",
    paso: "Calcular tu suma asegurada ideal",
  },
  salud: {
    t: "Cubre una enfermedad o accidente grave",
    msg: "Una hospitalización mayor puede acabar con años de ahorro. Los gastos médicos mayores te dan acceso a mejores hospitales sin descapitalizarte.",
    paso: "Comparar opciones de gastos médicos mayores",
  },
  emer: {
    t: "Construye tu colchón de emergencia",
    msg: "La meta es tener entre 3 y 6 meses de gastos disponibles. Con un plan de ahorro automático se logra más rápido de lo que parece.",
    paso: "Diseñar un plan de ahorro posible para ti",
  },
  ret: {
    t: "Prepara el ingreso de tu retiro",
    msg: "Tu pensión sola probablemente no alcance. Un Plan Personal de Retiro (PPR) suma ahorro y además puede darte beneficio fiscal.",
    paso: "Estimar cuánto necesitas ahorrar al mes",
  },
};

export function calcular(r) {
  const dep = dependientes(r);
  const w = dep ? { vida: 0.3, salud: 0.25, emer: 0.25, ret: 0.2 } : { vida: 0.2, salud: 0.3, emer: 0.25, ret: 0.25 };
  const areas = AREAS.map((a) => ({ ...a, puntaje: puntajeArea(a.id, r) }));
  const total = Math.round(areas.reduce((s, a) => s + a.puntaje * w[a.id], 0));
  const brechas = areas
    .filter((a) => a.puntaje < 70)
    .sort((a, b) => a.puntaje - b.puntaje)
    .slice(0, 4)
    .map((a) => {
      const x = ACCION[a.id];
      return { id: a.id, nombre: a.nombre, puntaje: a.puntaje, titulo: x.t, mensaje: a.id === "vida" ? (dep ? x.conDep : x.sinDep) : x.msg, paso: x.paso };
    });
  const meses = mesesColchon(r);
  return {
    total,
    nivel: nivelPuntaje(total),
    color: colorPuntaje(total),
    areas,
    brechas,
    meses,
    mesesRef: 24,
    dep,
    meta: r.meta || "",
    metaTxt: META_TXT[r.meta] || "tus metas",
  };
}

const ETIQ = {
  edad: Object.fromEntries(PREGUNTAS[0].op), dep: Object.fromEntries(PREGUNTAS[1].op), trab: Object.fromEntries(PREGUNTAS[2].op),
  vida: Object.fromEntries(PREGUNTAS[3].op), gmm: Object.fromEntries(PREGUNTAS[4].op), emer: Object.fromEntries(PREGUNTAS[5].op),
  ret: Object.fromEntries(PREGUNTAS[6].op), meta: Object.fromEntries(PREGUNTAS[7].op),
};

// Texto legible para las notas del prospecto en el CRM.
export function resumenParaCrm(r, res, fuente) {
  const l = (k) => ETIQ[k][r[k]] || "—";
  const lineas = [
    `Diagnóstico patrimonial (landing) · Puntaje ${res.total}/100 · ${res.nivel}`,
    `Edad: ${l("edad")} · Depende de su ingreso: ${l("dep")} · Ingresos: ${l("trab")}`,
    `Seguro de vida: ${l("vida")} · Gastos médicos: ${l("gmm")}`,
    `Aguantaría sin ingresos: ${l("emer")} · Retiro: ${l("ret")}`,
    `Prioridad: ${l("meta")}`,
    res.brechas.length ? `Brechas: ${res.brechas.map((b) => `${b.nombre} (${b.puntaje}/100)`).join(", ")}` : "Sin brechas relevantes.",
    fuente ? `Llegó desde: ${fuente}` : "",
  ];
  return lineas.filter(Boolean).join("\n");
}
