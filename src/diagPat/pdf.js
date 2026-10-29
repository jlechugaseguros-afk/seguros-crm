// Genera el entregable en PDF: cada hoja se dibuja a ancho carta y se convierte en una página.
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PROPS_SVG = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity", "font-family", "font-size", "font-weight", "text-anchor"];

// Las gráficas son SVG que usan clases y variables CSS; se fijan los valores finales para que se dibujen igual en el PDF.
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

function esperarImagenes(raiz) {
  return Promise.all([...raiz.querySelectorAll("img")].map((im) => (im.complete && im.naturalWidth ? Promise.resolve() : new Promise((ok) => { im.onload = ok; im.onerror = ok; }))));
}

export async function generarPdf(htmlReporte, { alProgreso } = {}) {
  const cap = document.createElement("div");
  cap.className = "dp dp-cap";
  cap.innerHTML = htmlReporte;
  document.body.appendChild(cap);
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await esperarImagenes(cap);
    await new Promise((r) => setTimeout(r, 60));
    fijarEstilosSvg(cap);
    const hojas = [...cap.querySelectorAll(".sheet")];
    let doc = null;
    for (let i = 0; i < hojas.length; i++) {
      if (alProgreso) alProgreso(i + 1, hojas.length);
      const canvas = await html2canvas(hojas[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: 816 });
      const w = 612;
      const alto = (w * canvas.height) / canvas.width;
      const h = Math.max(792, alto);
      if (!doc) doc = new jsPDF({ unit: "pt", format: [w, h], orientation: "portrait", compress: true });
      else doc.addPage([w, h], "portrait");
      doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, alto, undefined, "FAST");
      canvas.width = 1; canvas.height = 1;
    }
    return doc.output("blob");
  } finally {
    cap.remove();
  }
}
