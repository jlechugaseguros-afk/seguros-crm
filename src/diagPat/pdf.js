// Genera el entregable en PDF: cada hoja se dibuja a ancho carta y se convierte en una página.
// Pensado para iPad/Safari: imágenes incrustadas, tiempos límite por paso y menos memoria.
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PROPS_SVG = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity", "font-family", "font-size", "font-weight", "text-anchor"];
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function conTiempo(promesa, ms, paso) {
  let t;
  return Promise.race([
    promesa,
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`Se tardó demasiado en: ${paso}. Intenta de nuevo o cierra otras pestañas.`)), ms); }),
  ]).finally(() => clearTimeout(t));
}
const respiro = () => new Promise((r) => setTimeout(r, 30));

// Las gráficas son SVG con clases y variables CSS; se fijan los valores finales para que se dibujen igual en el PDF.
function fijarEstilosSvg(raiz) {
  raiz.querySelectorAll("svg").forEach((svg) => {
    const r = svg.getBoundingClientRect();
    svg.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el);
      PROPS_SVG.forEach((p) => { const v = cs.getPropertyValue(p); if (v) el.style.setProperty(p, v); });
    });
    if (r.width) { svg.setAttribute("width", r.width); svg.setAttribute("height", r.height); }
  });
}

// Convierte cada imagen a datos incrustados para que el motor no tenga que volver a descargarla.
async function incrustarImagenes(raiz) {
  const cache = {};
  for (const im of raiz.querySelectorAll("img")) {
    const src = im.getAttribute("src");
    if (!src || src.startsWith("data:")) continue;
    try {
      if (!cache[src]) {
        const blob = await (await fetch(src)).blob();
        cache[src] = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(blob); });
      }
      im.src = cache[src];
    } catch { /* se deja la imagen original */ }
  }
  await Promise.all([...raiz.querySelectorAll("img")].map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
}

export async function generarPdf(htmlReporte, { alProgreso } = {}) {
  const cap = document.createElement("div");
  cap.className = "dp dp-cap";
  cap.innerHTML = htmlReporte;
  document.body.appendChild(cap);
  try {
    if (document.fonts && document.fonts.ready) await conTiempo(document.fonts.ready, 8000, "cargar las fuentes").catch(() => {});
    await conTiempo(incrustarImagenes(cap), 20000, "preparar el logo y el QR");
    await respiro();
    fijarEstilosSvg(cap);
    const hojas = [...cap.querySelectorAll(".sheet")];
    const escala = esIOS() ? 1.5 : 2;
    let doc = null;
    for (let i = 0; i < hojas.length; i++) {
      if (alProgreso) alProgreso(i + 1, hojas.length);
      const canvas = await conTiempo(
        html2canvas(hojas[i], { scale: escala, backgroundColor: "#ffffff", useCORS: true, allowTaint: false, logging: false, windowWidth: 816, imageTimeout: 8000 }),
        45000, `dibujar la página ${i + 1} de ${hojas.length}`,
      );
      const w = 612;
      const alto = (w * canvas.height) / canvas.width;
      const h = Math.max(792, alto);
      const img = canvas.toDataURL("image/jpeg", 0.88);
      canvas.width = 1; canvas.height = 1;
      if (!doc) doc = new jsPDF({ unit: "pt", format: [w, h], orientation: "portrait", compress: true });
      else doc.addPage([w, h], "portrait");
      doc.addImage(img, "JPEG", 0, 0, w, alto, undefined, "FAST");
      await respiro();
    }
    return doc.output("blob");
  } finally {
    cap.remove();
  }
}
