import { pagosDePoliza, daysUntil, addMonthsStr, hoyISO, fmtMonto, fmtDateFull } from "./pagos.js";

// Lógica de Cobranza, Renovaciones y Venta cruzada (sin pantalla): se calcula a partir de clientes y pólizas.

export const ESTATUS_RENOVACION = ["Por contactar", "Contactado", "Cotizado", "Renovado", "No renueva"];
export const ESTATUS_CERRADOS = ["Renovado", "No renueva"];

// ---------- Cobranza ----------
export const clavePago = (cliente, poliza, fecha) => `${cliente.id}|${poliza.id}|${fecha}`;

// Todos los pagos de la cartera con su estado: pagado, vencido o pendiente.
// Los pagos anteriores a "desde" se consideran historia y no se cobran (salvo que ya estén marcados).
export function construirCobros(clients, cobranza, desde) {
  const items = [];
  (clients || []).forEach((c) => {
    (c.polizas || []).forEach((p) => {
      pagosDePoliza(p).forEach((pg) => {
        const key = clavePago(c, p, pg.date);
        const reg = cobranza[key];
        if (!reg && desde && pg.date < desde) return;
        const dias = daysUntil(pg.date, false);
        let estado = "pendiente";
        if (reg && reg.pagado) estado = "pagado";
        else if (dias !== null && dias < 0) estado = "vencido";
        items.push({ key, client: c, policy: p, pago: pg, dias, estado, registro: reg || null });
      });
    });
  });
  return items.sort((a, b) => a.pago.date.localeCompare(b.pago.date));
}

export function resumenCobros(items) {
  const hoy = hoyISO();
  const mes = hoy.slice(0, 7);
  const suma = (arr) => arr.reduce((n, i) => n + (Number(i.pago.monto) || 0), 0);
  const vencidos = items.filter((i) => i.estado === "vencido");
  const proximos = items.filter((i) => i.estado === "pendiente" && i.dias !== null && i.dias <= 30);
  const cobradosMes = items.filter((i) => i.estado === "pagado" && i.registro && String(i.registro.fecha || "").startsWith(mes));
  return {
    vencidos: { n: vencidos.length, monto: suma(vencidos) },
    proximos: { n: proximos.length, monto: suma(proximos) },
    cobradosMes: { n: cobradosMes.length, monto: cobradosMes.reduce((n, i) => n + (Number(i.registro.monto) || Number(i.pago.monto) || 0), 0) },
  };
}

// ---------- Renovaciones ----------
export const fechaRenovacionDe = (p) => p.fechaRenovacion || p.finVigencia || "";
export const claveRenovacion = (cliente, poliza, fecha) => `${cliente.id}|${poliza.id}|${fecha}`;

export function construirRenovaciones(clients, renovaciones) {
  const items = [];
  (clients || []).forEach((c) => {
    (c.polizas || []).forEach((p) => {
      const fecha = fechaRenovacionDe(p);
      const dias = daysUntil(fecha, false);
      if (dias === null) return;
      const key = claveRenovacion(c, p, fecha);
      const reg = renovaciones[key] || {};
      const estatus = reg.estatus || "Por contactar";
      // Ventana de trabajo: 60 días hacia atrás (vencidas sin renovar) y 90 hacia adelante
      if (dias < -60 || dias > 90) return;
      items.push({ key, client: c, policy: p, fecha, dias, estatus, nota: reg.nota || "", prima: Number(p.primaAnual) || 0 });
    });
  });
  return items.sort((a, b) => a.dias - b.dias);
}

// Ventana del tablero: 0 vencidas · 1 hasta 15 días · 2 hasta 30 · 3 hasta 60 · 4 hasta 90
export function ventanaRenovacion(dias) {
  if (dias < 0) return 0;
  if (dias <= 15) return 1;
  if (dias <= 30) return 2;
  if (dias <= 60) return 3;
  return 4;
}
export const VENTANAS = [
  { id: 0, label: "Vencidas", color: "#B23A2E" },
  { id: 1, label: "15 días", color: "#C2610C" },
  { id: 2, label: "30 días", color: "#B8892B" },
  { id: 3, label: "60 días", color: "#2B5C86" },
  { id: 4, label: "90 días", color: "#5C6B78" },
];

// Mueve la póliza al siguiente año de vigencia (al marcarla como renovada).
export function renovarPoliza(p) {
  const base = p.finVigencia || p.fechaRenovacion;
  if (!base) return p;
  const nuevoInicio = base;
  const mover = (f) => (f ? addMonthsStr(f, 12) : f);
  let fechaPago = p.fechaPago;
  if (fechaPago) {
    let guard = 0;
    while (fechaPago < nuevoInicio && guard++ < 40) fechaPago = addMonthsStr(fechaPago, 12);
  }
  return {
    ...p,
    inicioVigencia: nuevoInicio,
    finVigencia: mover(p.finVigencia),
    fechaRenovacion: mover(p.fechaRenovacion),
    fechaPago,
    clasificacion: "Renovación",
  };
}

// ---------- Venta cruzada ----------
export function familiaDeRamo(ramo) {
  const r = String(ramo || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/ppr|retiro/.test(r)) return "PPR";
  if (/vida/.test(r)) return "Vida";
  if (/gmm|gastos medicos|salud/.test(r)) return "GMM";
  if (/auto|vehic/.test(r)) return "Autos";
  if (/hogar|casa|dano/.test(r)) return "Hogar";
  if (/mascota/.test(r)) return "Mascotas";
  return "Otro";
}

const REGLAS = [
  { tiene: ["GMM"], falta: "Vida", prioridad: 1, motivo: "Tiene gastos médicos pero no seguro de vida." },
  { tiene: ["Vida"], falta: "GMM", prioridad: 1, motivo: "Tiene seguro de vida pero no gastos médicos mayores." },
  { tiene: ["Autos"], falta: "Vida", prioridad: 2, motivo: "Tiene seguro de auto pero ninguna protección para su familia." },
  { tiene: ["Vida", "GMM"], falta: "PPR", prioridad: 2, motivo: "Ya se protege, pero aún no ahorra para su retiro." },
  { tiene: ["Autos"], falta: "Hogar", prioridad: 3, motivo: "Asegura su auto pero no su casa o patrimonio." },
];

// Pólizas que siguen vigentes (o sin fecha de fin capturada).
function vigente(p) {
  if (!p.finVigencia) return true;
  const d = daysUntil(p.finVigencia, false);
  return d === null || d >= -30;
}

export function construirVentaCruzada(clients, estados) {
  const items = [];
  (clients || []).forEach((c) => {
    const activas = (c.polizas || []).filter(vigente);
    if (!activas.length) return;
    const familias = new Set(activas.map((p) => familiaDeRamo(p.ramo)));
    const prima = activas.reduce((n, p) => n + (Number(p.primaAnual) || 0), 0);
    const mejor = {};
    REGLAS.forEach((r) => {
      if (familias.has(r.falta)) return;
      if (!r.tiene.some((f) => familias.has(f))) return;
      if (!mejor[r.falta] || r.prioridad < mejor[r.falta].prioridad) mejor[r.falta] = r;
    });
    Object.entries(mejor).forEach(([falta, r]) => {
      const key = `${c.id}|${falta}`;
      const reg = estados[key] || null;
      items.push({
        key, client: c, sugerido: falta, motivo: r.motivo, prioridad: r.prioridad,
        tiene: [...familias].filter((f) => f !== "Otro"), prima, estado: reg ? reg.estado : "abierta", registro: reg,
      });
    });
  });
  return items.sort((a, b) => a.prioridad - b.prioridad || b.prima - a.prima);
}

export const NOMBRE_SUGERIDO = { Vida: "seguro de vida", GMM: "gastos médicos mayores", PPR: "un plan de retiro (PPR)", Hogar: "seguro de hogar" };

// ---------- Mensajes de WhatsApp ----------
export function telefonoWa(tel) {
  const d = String(tel || "").replace(/\D/g, "");
  if (d.length === 10) return `52${d}`;
  return d;
}
export const linkWa = (tel, texto) => `https://wa.me/${telefonoWa(tel)}?text=${encodeURIComponent(texto)}`;

const firmaDe = (nombre) => (nombre ? ` — ${nombre}` : "");

export function mensajeCobro(item, nombreAgente) {
  const { client, policy, pago, estado } = item;
  const poliza = policy.numeroPoliza ? ` de la póliza ${policy.numeroPoliza}` : "";
  const aseg = policy.aseguradora ? ` (${policy.aseguradora})` : "";
  const monto = pago.monto ? ` por ${fmtMonto(pago.monto)}` : "";
  const parc = pago.total > 1 ? ` (pago ${pago.numero} de ${pago.total})` : "";
  if (estado === "vencido") {
    return `Hola ${client.nombre}, te escribo porque tu pago${poliza}${aseg} con fecha ${fmtDateFull(pago.date)}${monto}${parc} aparece pendiente. ¿Me confirmas si ya lo realizaste o te ayudo a hacerlo? Así mantenemos tu cobertura vigente.${firmaDe(nombreAgente)}`;
  }
  return `Hola ${client.nombre}, te recuerdo tu próximo pago${poliza}${aseg} con fecha ${fmtDateFull(pago.date)}${monto}${parc}. Cualquier duda quedo al pendiente.${firmaDe(nombreAgente)}`;
}

export function mensajeRenovacion(item, nombreAgente) {
  const { client, policy, fecha, dias } = item;
  const poliza = policy.numeroPoliza ? ` ${policy.numeroPoliza}` : "";
  const aseg = policy.aseguradora ? ` con ${policy.aseguradora}` : "";
  const ramo = policy.ramo ? ` de ${policy.ramo}` : "";
  const cuando = dias < 0 ? `venció el ${fmtDateFull(fecha)}` : `vence el ${fmtDateFull(fecha)}`;
  return `Hola ${client.nombre}, tu póliza${poliza}${aseg}${ramo} ${cuando}. Quiero revisar contigo la renovación y cotizarte las mejores opciones para que sigas protegido. ¿Cuándo tienes unos minutos?${firmaDe(nombreAgente)}`;
}

export function mensajeVentaCruzada(item, nombreAgente) {
  const { client, sugerido, tiene } = item;
  const hoy = tiene.length ? tiene.join(" y ") : "tu seguro";
  return `Hola ${client.nombre}, revisando tu protección vi que ya cuentas con ${hoy}, pero todavía no tienes ${NOMBRE_SUGERIDO[sugerido] || sugerido}. Si te parece, lo vemos sin compromiso y solo si realmente te conviene. ¿Platicamos unos minutos?${firmaDe(nombreAgente)}`;
}
