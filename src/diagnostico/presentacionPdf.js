import { dinero, millones, pct, efectoOpcion, num } from "./calculos.js";

const NAVY = [11, 31, 58], ORO = [201, 162, 75], GRIS = [85, 98, 122], CLARO = [221, 227, 236], FONDO = [243, 231, 200];
const FREC = { mensual: 12, trimestral: 4, semestral: 2, anual: 1 };
export const primaMensual = (o) => (num(o.prima) * (FREC[o.frecuencia] || 12)) / 12;
const TITULOS = { ppr: "Retiro", vida: "Protección de vida", educacion: "Educación de tus hijos", gmm: "Salud (gastos médicos)" };

// Presentación para el cliente. formato "movil" (pantalla de celular) o "a4".
export async function generarPresentacion({ caso, supuestos: s, diag, propuesta, catalogo, agente, formato = "a4" }) {
  const { jsPDF } = await import("jspdf");
  const movil = formato === "movil";
  const W = movil ? 110 : 210, H = movil ? 196 : 297, M = movil ? 8 : 16, f = movil ? 0.82 : 1;
  const doc = new jsPDF({ unit: "mm", format: [W, H] });
  const prod = (id) => catalogo.find((p) => p.id === id);
  let y = 0;

  const txt = (t, size, style = "normal", color = NAVY) => { doc.setFont("helvetica", style); doc.setFontSize(size * f); doc.setTextColor(...color); };
  const salto = (h) => { if (y + h > H - M - 8) { doc.addPage([W, H]); fondoPagina(); y = M; } };
  const fondoPagina = () => { doc.setFillColor(237, 240, 245); doc.rect(0, 0, W, H, "F"); };
  const parrafo = (t, size = 10, color = NAVY, style = "normal", x = M, ancho = W - 2 * M) => {
    txt(t, size, style, color);
    const ls = doc.splitTextToSize(String(t), ancho);
    const alto = ls.length * size * f * 0.42;
    salto(alto); doc.text(ls, x, y + size * f * 0.35); y += alto + 1.5;
  };
  const barra = (x, ancho, valor, color = NAVY) => {
    doc.setFillColor(...CLARO); doc.roundedRect(x, y, ancho, 3, 1.5, 1.5, "F");
    const w = Math.max(3, ancho * Math.min(1, Math.max(0, valor)));
    doc.setFillColor(...color); doc.roundedRect(x, y, w, 3, 1.5, 1.5, "F"); y += 5;
  };
  const seccion = (n, titulo) => {
    salto(14); y += 3;
    doc.setFillColor(...ORO); doc.circle(M + 4, y + 3, 4, "F");
    txt(n, 8, "bold"); doc.text(n, M + 4, y + 4.2, { align: "center" });
    txt(titulo, 14, "bold"); doc.text(titulo, M + 11, y + 4.6); y += 11;
  };
  const fila = (a, b) => { salto(7); txt(a, 9.5, "normal", GRIS); doc.text(a, M, y + 3.5); txt(b, 9.5, "bold"); doc.text(b, W - M, y + 3.5, { align: "right" }); y += 6.5; };

  // Portada
  fondoPagina();
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, movil ? 46 : 58, "F");
  txt("J L CONSULTORÍA PATRIMONIAL", 8.5, "bold", [228, 199, 119]); doc.text("J L CONSULTORÍA PATRIMONIAL", M, M + 4);
  txt(`Plan de ${caso.nombre || "tu familia"}`, 22, "bold", [255, 255, 255]); doc.text(doc.splitTextToSize(`Plan de ${caso.nombre || "tu familia"}`, W - 2 * M), M, M + 16);
  txt("Diagnóstico financiero y propuesta", 10, "normal", [197, 205, 219]); doc.text("Diagnóstico financiero y propuesta", M, movil ? 36 : 44);
  txt(`${agente || "Tu asesor"} · ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}`, 8.5, "normal", [197, 205, 219]); doc.text(`${agente || "Tu asesor"} · ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}`, M, movil ? 41.5 : 50);
  y = (movil ? 46 : 58) + 4;

  // 01 dónde estás hoy
  const d = caso.datos;
  seccion("01", "Dónde estás hoy");
  fila("Ingreso mensual", dinero(d.ingreso)); fila("Gastos mensuales", dinero(d.gastos));
  fila("Te queda cada mes", dinero(diag.remanente)); fila("Ahorro e inversiones", dinero(d.ahorro));
  if (num(d.afore)) fila("Saldo de AFORE", dinero(d.afore));
  if (num(d.deudas)) fila("Deudas", dinero(d.deudas));
  y += 2;
  const metas = [];
  if (diag.retiro) metas.push(["Retiro", diag.retiro.cubierto]);
  metas.push(["Protección de tu familia", diag.proteccion.cubierto]);
  if (diag.educacion) metas.push(["Educación", 1 - diag.educacion.brecha / (diag.educacion.costoTotal || 1)]);
  metas.push(["Salud", diag.salud.cubierto]);
  metas.forEach(([n, v]) => { salto(10); txt(`${n}: hoy cubres ${pct(v)}`, 9, "bold"); doc.text(`${n}: hoy cubres ${pct(v)}`, M, y + 3); y += 4.5; barra(M, W - 2 * M, v); });

  // 02 a dónde quieres llegar
  seccion("02", "A dónde quieres llegar");
  if (diag.retiro) {
    const r = diag.retiro;
    parrafo(`Retiro a los ${d.edadRetiro || 65} años con ${dinero(d.ingresoRetiro)} al mes (en pesos de hoy). Para sostenerlo ${s.aniosRetiro} años necesitas juntar cerca de ${millones(r.capRequerido)} (equivalen a ${millones(r.capRequeridoHoy)} de hoy). Con lo que tienes llegarías a ${millones(r.capProyectado)}; faltan ${millones(r.brecha)}.`, 9.5);
  }
  parrafo(`Protección: para que tu familia mantenga su nivel de vida ${s.aniosSosten} años, pague deudas y cubra gastos finales se necesitan ${millones(diag.proteccion.necesidad)}. Hoy cuentas con ${millones(diag.proteccion.vigente)}.`, 9.5);
  if (diag.educacion) diag.educacion.hijos.forEach((h) => parrafo(`Educación de ${h.nombre}: la carrera costará cerca de ${millones(h.costoNominal)} dentro de ${h.anios} años.`, 9.5));
  parrafo(`Salud: un evento médico mayor puede costar cerca de ${millones(diag.salud.evento)}. ${diag.salud.tiene ? `Tu cobertura actual es de ${millones(diag.salud.vigente)}.` : "Hoy no cuentas con un seguro de gastos médicos privado."}`, 9.5);

  // 03 cómo lo resuelve la propuesta
  seccion("03", "Cómo lo resuelve la propuesta");
  let totalMes = 0;
  ["ppr", "vida", "educacion", "gmm"].forEach((ramo) => {
    const opts = (propuesta[ramo] || []).filter((o) => o.productoId);
    if (!opts.length) return;
    salto(14); txt(TITULOS[ramo], 11.5, "bold"); doc.text(TITULOS[ramo], M, y + 4); y += 8;
    opts.forEach((o, i) => {
      const p = prod(o.productoId); if (!p) return;
      const ef = efectoOpcion(ramo, { ...o, enUdi: p.sumaEnUdi }, diag, s);
      salto(28);
      doc.setFillColor(255, 255, 255); doc.roundedRect(M, y, W - 2 * M, 25, 3, 3, "F");
      const x0 = M + 3; let yy = y + 5.5;
      txt(`Opción ${String.fromCharCode(65 + i)} · ${p.aseguradora} ${p.nombre}`, 10, "bold"); doc.text(`Opción ${String.fromCharCode(65 + i)} · ${p.aseguradora} ${p.nombre}`, x0, yy); yy += 5.5;
      const clave = ramo === "ppr" ? `Aportas ${dinero(o.monto)} al mes` : `Suma asegurada ${p.sumaEnUdi ? num(o.monto).toLocaleString("es-MX") + " UDI" : dinero(o.monto)}`;
      txt(clave, 9, "normal", GRIS); doc.text(clave, x0, yy);
      if (num(o.prima)) { const t = `Prima ${dinero(o.prima)} ${o.frecuencia || "mensual"}`; doc.text(t, W - M - 3, yy, { align: "right" }); }
      yy += 4.5;
      const yb = y; y = yy; barra(x0, W - 2 * M - 6, ef.despues, ORO); yy = y + 1;
      txt(`Pasas de cubrir ${pct(ef.antes)} a ${pct(ef.despues)}`, 8.5, "bold"); doc.text(`Pasas de cubrir ${pct(ef.antes)} a ${pct(ef.despues)}`, x0, yy);
      y = yb + 28;
      if (i === 0) totalMes += primaMensual(o);
    });
    if (ramo === "ppr" && diag.retiro) {
      const f1 = diag.retiro.fiscal;
      parrafo(`Beneficio fiscal: tu aportación a un plan de retiro es deducible hasta ${dinero(f1.tope)} al año (el menor entre 10% de tu ingreso y 5 UMA). Con tu tasa marginal estimada podrías ahorrar cerca de ${dinero(f1.ahorroISR)} de ISR al año.`, 8.5, GRIS);
    }
    if (ramo === "gmm") {
      const o = opts[0], p = prod(o.productoId);
      if (p?.deducibles?.length && num(o.deducible)) parrafo(`En un evento mayor pagarías el deducible (${dinero(o.deducible)}) más el coaseguro (${num(o.coaseguro)}%, con tope), y el seguro cubre el resto hasta la suma asegurada.`, 8.5, GRIS);
    }
  });
  if (totalMes > 0) {
    salto(16); doc.setFillColor(...FONDO); doc.roundedRect(M, y, W - 2 * M, 12, 3, 3, "F");
    txt("Inversión mensual estimada (opción A de cada objetivo)", 8.5, "normal", NAVY); doc.text("Inversión mensual estimada (opción A de cada objetivo)", M + 3, y + 4.8);
    txt(dinero(totalMes), 12, "bold"); doc.text(dinero(totalMes), M + 3, y + 10); y += 16;
  }

  // Aviso
  salto(24); y += 2;
  parrafo(`Proyección ilustrativa con cifras estimadas y supuestos editables (inflación ${pct(s.inflacion)}, rendimiento ${pct(s.rendimiento)} anual, rendimiento real en el retiro ${pct(s.tasaRealRetiro)}, ${s.aniosRetiro} años de retiro). No constituye una garantía de rendimientos ni de aceptación. Las primas, coberturas y beneficios fiscales están sujetos a las condiciones generales de cada producto, a la suscripción de la aseguradora y a la legislación vigente.`, 7.5, GRIS);

  // numeración
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(...GRIS); doc.text(`J L Consultoría Patrimonial · ${i}/${n}`, W / 2, H - 4, { align: "center" }); }
  doc.save(`Plan-${(caso.nombre || "cliente").replace(/[^\w]+/g, "-")}-${movil ? "movil" : "A4"}.pdf`);
}
