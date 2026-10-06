import React, { useState, useRef } from "react";
import { FileText, Trash2, Plus, Download, X } from "lucide-react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { MC_LOGO } from "./brandAssets.js";
import { InsurerMark } from "./insurerLogos.jsx";
import { MAX_POLIZAS, parsePoliza, construirTabla, indiceMasBarato } from "./comparativoParser.js";

const MAX_MB = 15;
const NAVY = [11, 42, 68];
const GOLD = [201, 151, 30];

const inputStyle = {
  width: "100%", padding: "6px 7px", border: "1px solid var(--line)", borderRadius: 6,
  fontSize: 12, background: "#FFFFFF", color: "var(--ink)", minWidth: 96,
};

// ---------- Lectura del PDF (en el navegador, sin subir nada a ningún servidor) ----------
async function extraerLineas(file) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const lineas = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const filas = new Map();
    for (const it of content.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3); // tolerancia de 3 pt entre renglones
      if (!filas.has(y)) filas.set(y, []);
      filas.get(y).push({ x: it.transform[4], s: it.str });
    }
    [...filas.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => {
        lineas.push(items.sort((a, b) => a.x - b.x).map((i) => i.s).join(" "));
      });
  }
  return lineas;
}

// ---------- Imágenes para el PDF ----------
function cargarImagen(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function imagenParaPdf(src) {
  if (!src) return null;
  try {
    let dataUrl = src;
    if (!src.startsWith("data:")) {
      const res = await fetch(src);
      const blob = await res.blob();
      dataUrl = await new Promise((ok, fail) => {
        const r = new FileReader();
        r.onload = () => ok(r.result);
        r.onerror = fail;
        r.readAsDataURL(blob);
      });
    }
    const img = await cargarImagen(dataUrl);
    if (!img) return null;
    // Se pasa por canvas para que cualquier formato (jpg, png, webp) entre como PNG/JPEG válido
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return { data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    return null;
  }
}

// ---------- Generación del PDF ----------
async function generarPdf({ secciones, encabezados, profile, tarjeta }) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 32;

  const [foto, logo] = await Promise.all([
    imagenParaPdf(tarjeta?.fotoUrl),
    imagenParaPdf(MC_LOGO),
  ]);

  // Encabezado con los datos del agente
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 92, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 92, W, 3, "F");

  let x = M;
  if (foto) {
    const lado = 58;
    const ratio = foto.w / foto.h;
    const w = ratio >= 1 ? lado : lado * ratio;
    const h = ratio >= 1 ? lado / ratio : lado;
    doc.addImage(foto.data, "PNG", x, 17 + (lado - h) / 2, w, h);
    x += lado + 14;
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(profile?.nombre || "Agente de seguros", x, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const contacto = [];
  if (profile?.correo) contacto.push(profile.correo);
  if (tarjeta?.telefono) contacto.push(`Tel. ${tarjeta.telefono}`);
  if (tarjeta?.whatsapp) contacto.push(`WhatsApp ${tarjeta.whatsapp}`);
  contacto.forEach((l, i) => doc.text(l, x, 52 + i * 13));

  if (logo) {
    const h = 42;
    const w = h * (logo.w / logo.h);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W - M - w - 8, 23, w + 16, h + 6, 6, 6, "F");
    doc.addImage(logo.data, "PNG", W - M - w, 26, w, h);
  }

  // Título
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Comparativo de pólizas", M, 124);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(92, 107, 120);
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Fecha: ${fecha}`, W - M, 124, { align: "right" });

  // Tabla
  const n = encabezados.length;
  const colConcepto = 150;
  const colW = (W - 2 * M - colConcepto) / n;
  const head = [["Concepto", ...encabezados]];
  const body = [];
  const mejores = new Map(); // "fila-col" -> true

  secciones.forEach((sec) => {
    body.push([{ content: sec.title, colSpan: n + 1, styles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", halign: "left" } }]);
    sec.rows.forEach((row) => {
      if (sec.id === "costos") {
        indiceMasBarato(row.values).forEach((i) => mejores.set(`${body.length}-${i + 1}`, true));
      }
      body.push([{ content: row.label, styles: { fontStyle: "bold", halign: "left" } }, ...row.values]);
    });
  });

  autoTable(doc, {
    startY: 138,
    head,
    body,
    margin: { left: M, right: M, bottom: 54 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, valign: "middle", halign: "center", lineColor: [224, 229, 228], textColor: NAVY },
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: colConcepto } },
    didParseCell: (d) => {
      if (d.section !== "body" || d.column.index === 0) return;
      if (mejores.get(`${d.row.index}-${d.column.index}`)) {
        d.cell.styles.fillColor = [220, 238, 230];
        d.cell.styles.textColor = [30, 92, 76];
        d.cell.styles.fontStyle = "bold";
      }
    },
    tableWidth: colConcepto + colW * n,
  });

  // Nota y pie en todas las páginas
  const paginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.line(M, H - 40, W - M, H - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(92, 107, 120);
    doc.text("*Verificar el alcance de las coberturas otorgadas conforme a las condiciones generales de la póliza. En verde, el precio más bajo.", M, H - 28);
    doc.text("© 2026 J L Consultoría Patrimonial", M, H - 17);
    doc.text(`Página ${p} de ${paginas}`, W - M, H - 17, { align: "right" });
  }

  const nombreArchivo = `Comparativo-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nombreArchivo);
  return nombreArchivo;
}

// ---------- Pantalla ----------
export default function Comparativo({ profile, tarjeta }) {
  const [archivos, setArchivos] = useState([]); // [{ id, nombre, sinTexto }]
  const [secciones, setSecciones] = useState(null);
  const [leyendo, setLeyendo] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const inputRef = useRef(null);

  const n = archivos.length;
  const espacio = MAX_POLIZAS - n;

  async function agregar(fileList) {
    setError("");
    setOk("");
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (files.length > espacio) {
      setError(`Solo puedes comparar ${MAX_POLIZAS} pólizas como máximo. Puedes agregar ${espacio} más.`);
      return;
    }
    for (const f of files) {
      if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") {
        setError(`"${f.name}" no es un PDF.`);
        return;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`"${f.name}" pesa más de ${MAX_MB} MB.`);
        return;
      }
    }
    setLeyendo(true);
    try {
      const nuevas = [];
      for (const f of files) {
        let lineas = [];
        try {
          lineas = await extraerLineas(f);
        } catch (e) {
          console.error("PDF no legible:", f.name, e);
          setError(`No se pudo leer "${f.name}". Revisa que no esté protegido con contraseña.`);
          setLeyendo(false);
          return;
        }
        nuevas.push(parsePoliza(lineas, f.name));
      }
      const nuevaTabla = construirTabla(nuevas);
      setSecciones((prev) => {
        if (!prev) return nuevaTabla;
        // Se conserva lo que el agente ya editó y se agregan las columnas nuevas
        return prev.map((sec) => {
          const ref = nuevaTabla.find((s) => s.id === sec.id);
          return {
            ...sec,
            rows: sec.rows.map((row) => {
              const r = ref && ref.rows.find((x) => x.id === row.id);
              return { ...row, values: [...row.values, ...(r ? r.values : nuevas.map(() => "—"))] };
            }),
          };
        });
      });
      setArchivos((prev) => [
        ...prev,
        ...nuevas.map((p, i) => ({ id: `${Date.now()}-${i}`, nombre: files[i].name, sinTexto: p.sinTexto })),
      ]);
    } finally {
      setLeyendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function quitar(index) {
    setError("");
    setOk("");
    const quedan = archivos.filter((_, i) => i !== index);
    setArchivos(quedan);
    if (!quedan.length) {
      setSecciones(null);
      return;
    }
    setSecciones((prev) =>
      prev.map((sec) => ({ ...sec, rows: sec.rows.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== index) })) }))
    );
  }

  function cambiarCelda(secId, rowId, col, valor) {
    setSecciones((prev) =>
      prev.map((s) =>
        s.id !== secId ? s : { ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : { ...r, values: r.values.map((v, i) => (i === col ? valor : v)) })) }
      )
    );
  }

  function cambiarEtiqueta(secId, rowId, valor) {
    setSecciones((prev) =>
      prev.map((s) => (s.id !== secId ? s : { ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : { ...r, label: valor })) }))
    );
  }

  function agregarFila(secId) {
    setSecciones((prev) =>
      prev.map((s) =>
        s.id !== secId ? s : { ...s, rows: [...s.rows, { id: `x-${Date.now()}`, label: "Nueva fila", values: archivos.map(() => "—"), custom: true }] }
      )
    );
  }

  function quitarFila(secId, rowId) {
    setSecciones((prev) => prev.map((s) => (s.id !== secId ? s : { ...s, rows: s.rows.filter((r) => r.id !== rowId) })));
  }

  async function descargar() {
    setError("");
    setOk("");
    setGenerando(true);
    try {
      const aseg = secciones[0].rows.find((r) => r.id === "aseguradora");
      const encabezados = archivos.map((a, i) => {
        const nombre = aseg && aseg.values[i] && aseg.values[i] !== "—" ? aseg.values[i] : `Póliza ${i + 1}`;
        return nombre;
      });
      const nombre = await generarPdf({ secciones, encabezados, profile, tarjeta });
      setOk(`Listo: se descargó ${nombre}.`);
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el PDF: " + (e.message || "error desconocido"));
    }
    setGenerando(false);
  }

  const aseguradoraRow = secciones && secciones[0].rows.find((r) => r.id === "aseguradora");
  const hayEscaneados = archivos.some((a) => a.sinTexto);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h3 className="serif" style={{ fontSize: 18, color: "var(--ink)", margin: "0 0 4px", fontWeight: 500 }}>Comparativo de pólizas</h3>
      <p style={{ fontSize: 12, color: "var(--stone)", marginBottom: 14 }}>
        Sube de 2 a {MAX_POLIZAS} pólizas o cotizaciones en PDF. Se arma la tabla de precios y coberturas, la revisas y descargas el PDF con tus datos de agente.
      </p>

      <div style={{ background: "#FFFFFF", border: "1px solid var(--line)", borderRadius: 14, padding: 14, boxShadow: "var(--shadow)", marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: n ? 12 : 0 }}>
          {archivos.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", fontSize: 12, maxWidth: 260 }}>
              <FileText size={14} color="var(--ink)" style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre}</span>
              <button onClick={() => quitar(i)} aria-label={`Quitar ${a.nombre}`} style={{ background: "none", border: "none", padding: 2, display: "flex", color: "#B23A2E" }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <input
          ref={inputRef} type="file" accept="application/pdf,.pdf" multiple
          onChange={(e) => agregar(e.target.files)} style={{ display: "none" }}
        />
        <button
          onClick={() => inputRef.current && inputRef.current.click()}
          disabled={leyendo || espacio <= 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: espacio <= 0 ? "var(--line)" : "var(--ink)", color: "var(--cream)",
            border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus size={15} />
          {leyendo ? "Leyendo PDF…" : espacio <= 0 ? `Máximo ${MAX_POLIZAS} pólizas` : n ? `Agregar otra póliza (${n}/${MAX_POLIZAS})` : "Subir pólizas en PDF"}
        </button>
      </div>

      {error && <p style={{ fontSize: 13, color: "#B23A2E", margin: "0 0 12px" }}>{error}</p>}
      {hayEscaneados && (
        <p style={{ fontSize: 12.5, color: "var(--gold-text)", background: "var(--gold-soft)", borderRadius: 8, padding: "8px 10px", margin: "0 0 12px" }}>
          Alguno de los PDF parece una imagen escaneada y no trae texto que leer. Captura sus datos a mano en la tabla.
        </p>
      )}

      {secciones && (
        <>
          <p style={{ fontSize: 12, color: "var(--stone)", margin: "0 0 8px" }}>
            Revisa la tabla: la lectura automática puede fallar según el formato de cada aseguradora. Toca cualquier celda para corregirla. El precio más bajo se marca en verde.
          </p>
          <div style={{ overflowX: "auto", background: "#FFFFFF", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "var(--shadow)" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 160 + n * 130, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--ink)", color: "#fff" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", width: 190 }}>Concepto</th>
                  {archivos.map((a, i) => (
                    <th key={a.id} style={{ padding: "10px 8px", textAlign: "center" }}>
                      {aseguradoraRow && aseguradoraRow.values[i] !== "—" && (
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                          <InsurerMark name={aseguradoraRow.values[i]} w={64} h={36} radius={8} color="rgba(255,255,255,.18)" fontSize={14} />
                        </div>
                      )}
                      {aseguradoraRow && aseguradoraRow.values[i] !== "—" ? aseguradoraRow.values[i] : `Póliza ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {secciones.map((sec) => (
                  <React.Fragment key={sec.id}>
                    <tr>
                      <td colSpan={n + 1} style={{ background: "var(--gold-soft)", color: "var(--gold-text)", fontWeight: 700, padding: "8px 12px", fontSize: 12 }}>
                        {sec.title}
                      </td>
                    </tr>
                    {sec.rows.map((row) => {
                      const mejores = sec.id === "costos" ? indiceMasBarato(row.values) : [];
                      return (
                        <tr key={row.id} style={{ borderTop: "1px solid var(--line)" }}>
                          <td style={{ padding: "6px 12px", fontWeight: 600, color: "var(--ink)" }}>
                            {row.custom ? (
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <input value={row.label} onChange={(e) => cambiarEtiqueta(sec.id, row.id, e.target.value)} style={inputStyle} />
                                <button onClick={() => quitarFila(sec.id, row.id)} aria-label="Quitar fila" style={{ background: "none", border: "none", color: "#B23A2E", padding: 2, display: "flex" }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : row.label}
                          </td>
                          {row.values.map((v, i) => (
                            <td key={i} style={{ padding: 4 }}>
                              <input
                                value={v}
                                onChange={(e) => cambiarCelda(sec.id, row.id, i, e.target.value)}
                                style={{
                                  ...inputStyle, textAlign: "center",
                                  ...(mejores.includes(i) ? { background: "#DCEEE6", borderColor: "var(--emerald)", color: "var(--emerald)", fontWeight: 700 } : {}),
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={n + 1} style={{ padding: "4px 12px 8px" }}>
                        <button onClick={() => agregarFila(sec.id)} style={{ background: "none", border: "none", color: "var(--emerald)", fontSize: 12, fontWeight: 600, padding: 0 }}>
                          + Agregar fila
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {(!profile?.nombre || !tarjeta?.telefono) && (
            <p style={{ fontSize: 12, color: "var(--gold-text)", margin: "12px 0 0" }}>
              Tip: completa tu teléfono y WhatsApp en la pestaña Tarjeta digital para que salgan completos en el encabezado del PDF.
            </p>
          )}

          <button
            onClick={descargar}
            disabled={generando}
            style={{
              marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, background: "var(--emerald)", color: "#fff",
              border: "none", borderRadius: 10, padding: "12px 18px", fontSize: 14, fontWeight: 600,
            }}
          >
            <Download size={16} />
            {generando ? "Generando PDF…" : "Descargar comparativo en PDF"}
          </button>
          {ok && <p style={{ fontSize: 13, color: "var(--emerald)", margin: "10px 0 0" }}>{ok}</p>}
        </>
      )}
    </div>
  );
}
