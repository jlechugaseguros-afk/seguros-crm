// Motor de cálculo del diagnóstico financiero. Funciones puras, sin dependencias de la interfaz.
// Todas las cifras son proyecciones con supuestos editables, no garantías.
import { TASA_FONDO_POR_EDAD } from "./catalogoBase.js";

export const UMA_DIARIA_2026 = 117.31; // vigente desde el 1 de febrero de 2026 (INEGI, DOF 09/01/2026)

export function supuestosPorDefecto(edad = 35) {
  return {
    inflacion: 0.04,
    rendimiento: TASA_FONDO_POR_EDAD(edad), // tasa de proyección de AXA según la edad
    tasaRealRetiro: 0.03, // rendimiento real mientras se gasta el capital
    aniosRetiro: 25, // años que debe durar el ingreso en el retiro
    aniosSosten: 10, // años de gasto familiar que debe cubrir el seguro de vida
    gastosFinales: 100000,
    inflacionEducacion: 0.05,
    rendimientoEducacion: 0.05,
    costoCarreraHoy: 1300000, // referencia AXA: carrera en universidad privada
    edadUniversidad: 18,
    costoEvento: 3000000, // evento médico mayor estimado
    umaDiaria: UMA_DIARIA_2026,
    tasaMarginalISR: 0.3,
    valorUDI: 8.9, // editable: verificar en Banxico
  };
}

export const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const mensual = (anual) => Math.pow(1 + anual, 1 / 12) - 1;
const valorPresente = (pago, r, n) => (r === 0 ? pago * n : (pago * (1 - Math.pow(1 + r, -n))) / r);
const valorFuturo = (pago, i, m) => (i === 0 ? pago * m : pago * ((Math.pow(1 + i, m) - 1) / i));
// aportación mensual que, con rendimiento anual `tasa`, llega a `meta` en `anios`
export function aportacionParaMeta(meta, tasa, anios) {
  if (meta <= 0) return 0;
  const m = Math.round(anios * 12);
  if (m <= 0) return meta;
  const i = mensual(tasa);
  return meta / (i === 0 ? m : (Math.pow(1 + i, m) - 1) / i);
}

export function calcRetiro(d, s) {
  const edad = num(d.edad);
  const aniosAcum = Math.max(0, num(d.edadRetiro || 65) - edad);
  const factorInfl = Math.pow(1 + s.inflacion, aniosAcum);
  const necesarioHoy = Math.max(0, num(d.ingresoRetiro) - num(d.otroIngresoRetiro));
  const mensualNominal = necesarioHoy * factorInfl;
  const capRequerido = valorPresente(mensualNominal, mensual(s.tasaRealRetiro), Math.round(s.aniosRetiro * 12));
  const i = mensual(s.rendimiento);
  const capActual = (num(d.ahorro) + num(d.afore)) * Math.pow(1 + s.rendimiento, aniosAcum);
  const capAportes = valorFuturo(num(d.aportacionRetiro), i, Math.round(aniosAcum * 12));
  const capProyectado = capActual + capAportes;
  const brecha = Math.max(0, capRequerido - capProyectado);
  const aportacionNecesaria = aportacionParaMeta(brecha, s.rendimiento, aniosAcum);
  const cubierto = capRequerido > 0 ? Math.min(1, capProyectado / capRequerido) : 1;
  // beneficio fiscal (art. 151): tope = menor entre 10% del ingreso anual y 5 UMA anuales
  const topeUma = 5 * s.umaDiaria * 365;
  const tope = Math.min(0.1 * num(d.ingreso) * 12, topeUma);
  const aportAnual = (num(d.aportacionRetiro) + aportacionNecesaria) * 12;
  const deducible = Math.min(aportAnual, tope);
  return {
    aniosAcum, factorInfl, necesarioHoy, mensualNominal, capRequerido, capRequeridoHoy: capRequerido / factorInfl,
    capProyectado, brecha, brechaHoy: brecha / factorInfl, aportacionNecesaria, cubierto,
    fiscal: { tope, topeUma, deducible, ahorroISR: deducible * s.tasaMarginalISR },
  };
}

export function calcProteccion(d, s) {
  const gastosAnuales = num(d.gastos) * 12;
  const tieneFamilia = num(d.dependientes) > 0 || d.pareja === "si";
  const sosten = tieneFamilia ? gastosAnuales * s.aniosSosten : 0;
  const necesidad = sosten + num(d.deudas) + s.gastosFinales;
  const vigente = num(d.vidaVigente);
  const brecha = Math.max(0, necesidad - vigente);
  const edades = (d.hijos || []).map((h) => num(h.edad));
  const aniosHijos = edades.length ? Math.max(0, num(s.edadUniversidad) + 4 - Math.min(...edades)) : 0;
  const plazoSugerido = Math.max(5, Math.min(Math.max(s.aniosSosten, aniosHijos, 10), Math.max(5, 70 - num(d.edad))));
  return { sosten, necesidad, vigente, brecha, cubierto: necesidad > 0 ? Math.min(1, vigente / necesidad) : 1, tieneFamilia, plazoSugerido };
}

export function calcEducacion(d, s) {
  const hijos = (d.hijos || []).map((h) => {
    const anios = Math.max(0, s.edadUniversidad - num(h.edad));
    const costoHoy = num(h.costoHoy) || s.costoCarreraHoy;
    const costoNominal = costoHoy * Math.pow(1 + s.inflacionEducacion, anios);
    const ahorrado = num(h.ahorrado) * Math.pow(1 + s.rendimientoEducacion, anios);
    const brecha = Math.max(0, costoNominal - ahorrado);
    return { nombre: h.nombre || "Hijo", edad: num(h.edad), anios, costoHoy, costoNominal, brecha, aportacion: aportacionParaMeta(brecha, s.rendimientoEducacion, anios) };
  });
  return {
    hijos,
    brecha: hijos.reduce((a, h) => a + h.brecha, 0),
    aportacion: hijos.reduce((a, h) => a + h.aportacion, 0),
    costoTotal: hijos.reduce((a, h) => a + h.costoNominal, 0),
  };
}

export function calcSalud(d, s) {
  const vigente = d.gmmTiene === "si" ? num(d.gmmSuma) : 0;
  const brecha = Math.max(0, s.costoEvento - vigente);
  return { evento: s.costoEvento, vigente, brecha, cubierto: s.costoEvento > 0 ? Math.min(1, vigente / s.costoEvento) : 1, tiene: d.gmmTiene === "si", liquidez: num(d.ahorro) };
}

export function diagnosticoCompleto(d, s) {
  return {
    retiro: d.metaRetiro === false ? null : calcRetiro(d, s),
    proteccion: calcProteccion(d, s),
    educacion: (d.hijos || []).length ? calcEducacion(d, s) : null,
    salud: calcSalud(d, s),
    remanente: num(d.ingreso) - num(d.gastos),
  };
}

// ---------- Recomendación de productos del catálogo ----------
const enRango = (p, edad) => edad >= (p.edadMin ?? 0) && edad <= (p.edadMax ?? 120);

export function exposicionGmm(p, deducible, coaseguro) {
  const tope = p.topesCoaseguro?.[coaseguro];
  return tope != null ? deducible + tope : null;
}

export function recomendarGmm(p, diag) {
  const sumas = [...(p.sumas || [])].sort((a, b) => a - b);
  const sumaRec = sumas.find((x) => x >= diag.salud.evento) || sumas[sumas.length - 1];
  let deducibleRec = null, coaseguroRec = null, exposicion = null;
  if (p.deducibles?.length && p.coaseguros?.length) {
    coaseguroRec = p.coaseguros[0];
    const ds = [...p.deducibles].sort((a, b) => a - b);
    const tope = p.topesCoaseguro?.[coaseguroRec] ?? 0;
    deducibleRec = [...ds].reverse().find((x) => x + tope <= diag.salud.liquidez) || ds[0];
    exposicion = deducibleRec + tope;
  }
  return { sumaRec, deducibleRec, coaseguroRec, exposicion };
}

export function recomendarProductos(ramo, d, diag, s, catalogo) {
  const edad = num(d.edad);
  const lista = catalogo.filter((p) => p.ramo === ramo && !p.oculto);
  return lista.map((p) => {
    const motivos = [], avisos = [];
    let ok = true, puntos = 0;
    if (!enRango(p, edad)) { ok = false; avisos.push(`Edad fuera de rango (${p.edadMin ?? 0} a ${p.edadMax ?? "sin límite"} años)`); } else { puntos += 1; }
    if (ramo === "ppr" && diag.retiro) {
      const edadR = num(d.edadRetiro || 65);
      const edades = p.retiroEdades || [p.retiroEdad || 65];
      if (!edades.includes(edadR)) { avisos.push(`Retiro a los ${edadR} años no está entre sus plazos (${edades.join(", ")})`); }
      else { puntos += 1; motivos.push(`Permite retirarse a los ${edadR} años`); }
      const aportAnual = (num(d.aportacionRetiro) + diag.retiro.aportacionNecesaria) * 12;
      if (p.primaMinAnual && aportAnual < p.primaMinAnual) { ok = false; avisos.push(`La prima mínima es ${dinero(p.primaMinAnual)} al año`); }
      else if (p.primaMinAnual) motivos.push("La aportación necesaria supera la prima mínima");
      if (p.fiscal) { puntos += 1; motivos.push(`Beneficio fiscal: art. ${p.fiscal} de la LISR`); }
      const fondo = (p.fondos || []).find((f) => f.tasa === s.rendimiento);
      if (fondo) motivos.push(`Fondo sugerido por edad: ${fondo.nombre} (${Math.round(fondo.tasa * 100)}%)`);
    }
    if (ramo === "vida") {
      const brecha = diag.proteccion.brecha;
      if (!brecha) { avisos.push("La protección actual ya cubre la necesidad"); }
      else if (p.sumaMin && brecha < p.sumaMin) { avisos.push(`La brecha es menor a la suma mínima (${dinero(p.sumaMin)})`); }
      else { puntos += 1; }
      if (p.tipo === "temporal") { puntos += 1; motivos.push(`Cubre la brecha con menor costo; plazo sugerido ${diag.proteccion.plazoSugerido} años`); }
      if (p.tipo === "vitalicio") motivos.push("Protección de por vida con valor en efectivo; útil si también quiere patrimonio o herencia");
    }
    if (ramo === "educacion" && diag.educacion) {
      const menor = Math.min(...(d.hijos || []).map((h) => num(h.edad)));
      if (p.edadHijoMax != null && menor > p.edadHijoMax) { ok = false; avisos.push(`El hijo debe tener hasta ${p.edadHijoMax} años`); }
      else { puntos += 1; motivos.push("Ahorro garantizado para la carrera, con protección si el titular falta"); }
      if (p.sumaMax && p.sumaEnUdi) {
        const maxPesos = p.sumaMax * s.valorUDI;
        if (diag.educacion.costoTotal > maxPesos) avisos.push(`Tope de ${p.sumaMax.toLocaleString("es-MX")} UDI (≈ ${dinero(maxPesos)}) por póliza`);
      }
    }
    if (ramo === "gmm") {
      const r = recomendarGmm(p, diag);
      if (r.sumaRec) { puntos += 1; motivos.push(`Suma asegurada sugerida: ${dinero(r.sumaRec)}`); }
      if (r.exposicion != null) motivos.push(`Deducible ${dinero(r.deducibleRec)} + coaseguro ${r.coaseguroRec}%: en un evento mayor el cliente pagaría como máximo ${dinero(r.exposicion)}`);
      else avisos.push("Sin tabla de deducibles cargada: tomar de la cotización");
    }
    return { producto: p, ok, motivos, avisos, puntos: ok ? puntos : -1 };
  }).sort((a, b) => b.puntos - a.puntos);
}

// ---------- Efecto de una opción de la propuesta ----------
export function efectoOpcion(ramo, opt, diag, s) {
  const m = num(opt.monto); // retiro/educación: aportación mensual · vida/GMM: suma asegurada
  if (ramo === "ppr" && diag.retiro) {
    const r = diag.retiro;
    const faltaAporte = r.aportacionNecesaria;
    const pctBrecha = faltaAporte <= 0 ? 1 : Math.min(1, m / faltaAporte);
    const total = Math.min(1, r.cubierto + (1 - r.cubierto) * pctBrecha);
    return { pctBrecha, antes: r.cubierto, despues: total, ingresoLogrado: r.necesarioHoy * total };
  }
  if (ramo === "vida") {
    const b = diag.proteccion.brecha;
    const pctBrecha = b <= 0 ? 1 : Math.min(1, m / b);
    const nec = diag.proteccion.necesidad || 1;
    return { pctBrecha, antes: diag.proteccion.cubierto, despues: Math.min(1, (diag.proteccion.vigente + Math.min(m, b)) / nec) };
  }
  if (ramo === "educacion" && diag.educacion) {
    const sumaPesos = opt.enUdi ? m * s.valorUDI : m;
    const b = diag.educacion.brecha;
    const pctBrecha = b <= 0 ? 1 : Math.min(1, sumaPesos / b);
    return { pctBrecha, antes: 1 - (b / (diag.educacion.costoTotal || 1)), despues: Math.min(1, 1 - (b * (1 - pctBrecha)) / (diag.educacion.costoTotal || 1)) };
  }
  if (ramo === "gmm") {
    const e = diag.salud.evento || 1;
    const pctBrecha = diag.salud.brecha <= 0 ? 1 : Math.min(1, m / diag.salud.brecha);
    return { pctBrecha, antes: diag.salud.cubierto, despues: Math.min(1, (diag.salud.vigente + Math.min(m, e)) / e) };
  }
  return { pctBrecha: 0, antes: 0, despues: 0 };
}

export function dinero(n) {
  const v = Math.round(num(n));
  return "$" + v.toLocaleString("es-MX");
}
export function millones(n) {
  const v = num(n);
  return Math.abs(v) >= 1e6 ? "$" + (v / 1e6).toFixed(2) + " M" : dinero(v);
}
export const pct = (x) => Math.round(num(x) * 100) + "%";
