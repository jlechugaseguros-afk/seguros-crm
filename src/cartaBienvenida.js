import { jsPDF } from "jspdf";

// Carta de bienvenida de la aseguradora (formato aprobado por Joshua, 2026-11-19).
// Página de 3:4 (612 x 816 pt). Todas las medidas salen del formato original, en píxeles de una hoja de 1728 x 2304.
// Campos editables: logo de la aseguradora, nombre del asegurado, fecha, nombre de la aseguradora, logo del asesor y QR.
// Las imágenes llegan ya normalizadas ({ data, w, h, fmt }) para que este módulo no dependa del navegador.

const PAG_W = 612;
const PAG_H = 816;
const S = PAG_W / 1728;
const px = (v) => v * S;

const FS_CUERPO = px(46);
const INTERLINEADO = px(64);
const ANCHO_TEXTO = 510;
const X_TEXTO = px(146);
const BASE_PRIMER_RENGLON = px(641);

export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function hoyDdMmAaaa(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// "19/11/2026" -> "19 de Noviembre de 2026". Si el texto no es una fecha dd/mm/aaaa, se deja tal cual.
export function fechaLarga(txt) {
  const m = String(txt || "").trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return String(txt || "").trim();
  const d = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return String(txt).trim();
  return `${d} de ${MESES[mo - 1]} de ${m[3]}`;
}

// "Seguros Banorte" -> "Banorte Seguros" (así se lee en la carta: "Familia Banorte Seguros").
export function nombreParaCarta(aseguradora) {
  const t = String(aseguradora || "").trim();
  const m = t.match(/^Seguros\s+(.+)$/i);
  return m ? `${m[1]} Seguros` : t;
}

export function parrafosCarta(aseguradora) {
  const a = String(aseguradora || "").trim() || "tu aseguradora";
  return [
    [
      `Agradecemos tu preferencia y te damos la más cordial bienvenida a la Familia ${a}.`,
      "Para nosotros será un placer atenderte y brindarte toda la tranquilidad y confianza que necesitas a donde quiera que vayas, a través de un servicio cercano y de calidad.",
    ],
    [
      "Estamos muy orgullosos de ser la aseguradora de tu preferencia y nuestro compromiso contigo es total. Con nosotros, siéntete seguro y protegido, pues tu bienestar en todos los caminos que recorras, será nuestra prioridad.",
      "Ten la seguridad de que constantemente buscaremos mejorar para ti y así seguir siendo tu mejor opción.",
      `En nombre de todos los que formamos parte de ${a}, agradecemos tu elección y confianza al asegurarte con nosotros.`,
    ],
  ];
}

// Dibuja una imagen dentro de una caja sin deformarla. alin: "izq" | "centro".
function imagenEnCaja(doc, img, caja, alin = "izq") {
  if (!img || !img.data || !img.w || !img.h) return;
  const k = Math.min(caja.w / img.w, caja.h / img.h);
  const w = img.w * k;
  const h = img.h * k;
  const x = alin === "centro" ? caja.x + (caja.w - w) / 2 : caja.x;
  const y = caja.y + (caja.h - h) / 2;
  doc.addImage(img.data, img.fmt || "PNG", x, y, w, h, undefined, "FAST");
}

/**
 * Genera la carta como PDF (ArrayBuffer).
 * @param {object} c
 * @param {string} c.saludo        "Estimada" | "Estimado"
 * @param {string} c.asegurado     nombre del asegurado (sale en negritas)
 * @param {string} c.fecha         fecha ya en formato largo ("19 de Noviembre de 2026")
 * @param {string} c.aseguradora   nombre de la aseguradora para el texto
 * @param {object} c.logoAseg      imagen normalizada del logo de la aseguradora
 * @param {object} c.logoAgente    imagen normalizada del logo del asesor
 * @param {object} c.qr            imagen normalizada del QR (si falta, tampoco sale el pie "Recibe una asesoría...")
 * @param {object} c.decor         imagen normalizada del fondo (familia, auto y curva)
 */
export function generarCartaPdf(c) {
  const doc = new jsPDF({ unit: "pt", format: [PAG_W, PAG_H], compress: true });

  // Fondo decorativo (esquina inferior derecha), detrás de todo.
  if (c.decor && c.decor.data) {
    doc.addImage(c.decor.data, c.decor.fmt || "JPEG", px(850), px(940), px(878), px(1364), undefined, "FAST");
  }

  // Logo de la aseguradora (arriba a la izquierda).
  imagenEnCaja(doc, c.logoAseg, { x: px(91), y: px(135), w: px(705), h: px(150) }, "izq");

  // Fecha (arriba a la derecha).
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(px(47));
  doc.text(String(c.fecha || ""), px(1657), px(302), { align: "right" });

  // Saludo: "Estimada" normal + nombre en negritas (si el nombre es muy largo se achica para que quepa en un renglón).
  const saludo = `${c.saludo || "Estimada"} `;
  const nombre = String(c.asegurado || "").trim();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_CUERPO);
  const wSaludo = doc.getTextWidth(saludo);
  doc.text(saludo, X_TEXTO, BASE_PRIMER_RENGLON - 2 * INTERLINEADO);
  doc.setFont("helvetica", "bold");
  let fsNombre = FS_CUERPO;
  doc.setFontSize(fsNombre);
  while (wSaludo + doc.getTextWidth(nombre) > ANCHO_TEXTO && fsNombre > FS_CUERPO * 0.55) {
    fsNombre -= 0.5;
    doc.setFontSize(fsNombre);
  }
  doc.text(nombre, X_TEXTO + wSaludo, BASE_PRIMER_RENGLON - 2 * INTERLINEADO);

  // Cuerpo: cada oración empieza en renglón nuevo; entre párrafos hay un renglón en blanco.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_CUERPO);
  let renglon = 0;
  parrafosCarta(c.aseguradora).forEach((parrafo, i) => {
    if (i > 0) renglon += 1;
    parrafo.forEach((oracion) => {
      doc.splitTextToSize(oracion, ANCHO_TEXTO).forEach((linea) => {
        doc.text(linea, X_TEXTO, BASE_PRIMER_RENGLON + renglon * INTERLINEADO);
        renglon += 1;
      });
    });
  });

  // Pie: logo del asesor, QR y leyenda.
  imagenEnCaja(doc, c.logoAgente, { x: px(90), y: px(1960), w: px(455), h: px(180) }, "izq");
  if (c.qr && c.qr.data) {
    imagenEnCaja(doc, c.qr, { x: px(642), y: px(1905), w: px(265), h: px(265) }, "centro");
    // Leyenda en serif; se ajusta al ancho del formato original (869 px) y "sin costo" va subrayado.
    const partes = ["Recibe una asesoría patrimonial ", "sin costo", " escaneando el código QR"];
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    const total = partes.reduce((a, p) => a + doc.getTextWidth(p), 0);
    const fs = (10 * px(869)) / total;
    doc.setFontSize(fs);
    let x = px(47);
    const y = px(2258);
    partes.forEach((p, i) => {
      doc.text(p, x, y);
      const w = doc.getTextWidth(p);
      if (i === 1) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.6);
        doc.line(x, y + 2, x + w, y + 2);
      }
      x += w;
    });
  }

  return doc.output("arraybuffer");
}
