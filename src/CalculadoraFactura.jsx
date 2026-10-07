import React, { useState, useMemo, useEffect } from "react";

// Calculadora de factura (CFDI) para comisiones de seguros.
// Se captura solo el TOTAL y se obtienen subtotal, base, IVA y retenciones.

const TASA_IVA = 0.16;
const TASA_RET_IVA = 0.106667; // la que usa el SAT en el XML (2/3 de 16%)
const TASA_RET_ISR_RESICO = 0.0125;

const REGIMENES = [
  { id: "resico", label: "RESICO (Régimen Simplificado de Confianza)", isr: TASA_RET_ISR_RESICO },
  { id: "pfae", label: "PF Actividad Empresarial", isr: 0 },
];

// Campos de la factura que cada agente captura una sola vez (se guardan en su cuenta).
const CAMPOS = [
  { k: "emisor", label: "Emisor (tu nombre completo)", def: "", ph: "NOMBRE APELLIDOS" },
  { k: "rfc", label: "RFC emisor", def: "", ph: "XXXX000000XXX" },
  { k: "cp", label: "Código postal de expedición", def: "", ph: "00000" },
  { k: "receptor", label: "Receptor", def: "MACOOLEY BROKERS, AGENTE DE SEGUROS" },
  { k: "rfcReceptor", label: "RFC receptor", def: "MBA161004PB9" },
  { k: "cpReceptor", label: "CP receptor", def: "11520" },
  { k: "regReceptor", label: "Régimen receptor", def: "General de Ley Personas Morales" },
  { k: "uso", label: "Uso CFDI", def: "Gastos en general (G03)" },
  { k: "clave", label: "Clave producto/servicio", def: "80141600" },
  { k: "descripcion", label: "Descripción", def: "COMISIONES NO VIDA" },
  { k: "cantidad", label: "Cantidad", def: "1" },
  { k: "unidad", label: "Clave de unidad", def: "E48 – Unidad de servicio" },
  { k: "objeto", label: "Objeto de impuesto", def: "Sí objeto de impuesto" },
  { k: "moneda", label: "Moneda", def: "Peso Mexicano (MXN)" },
  { k: "forma", label: "Forma de pago", def: "03 – Transferencia electrónica de fondos" },
  { k: "metodo", label: "Método de pago", def: "PUE – Pago en una sola exhibición" },
  { k: "efecto", label: "Efecto del comprobante", def: "Ingreso" },
];
const DEFAULTS = Object.fromEntries(CAMPOS.map((c) => [c.k, c.def]));
const REG_EMISOR = { resico: "Régimen Simplificado de Confianza (626)", pfae: "Personas Físicas con Actividades Empresariales (612)" };
const STORAGE_KEY = "facturaDatos";

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const r6 = (n) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;
const f2 = (n) => Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f6 = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 });

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    } catch (e) {
      /* sin permiso de portapapeles */
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      style={{
        background: ok ? "var(--emerald)" : "none", color: ok ? "#fff" : "var(--muted)",
        border: "1px solid var(--line)", borderRadius: 8, padding: "3px 9px", fontSize: 11, cursor: "pointer",
      }}
    >
      {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function CalculadoraFactura() {
  const [totalTxt, setTotalTxt] = useState("15000");
  const [regimen, setRegimen] = useState("resico");
  const [ajuste, setAjuste] = useState(0); // centavos
  const [datos, setDatos] = useState(DEFAULTS);
  const [editando, setEditando] = useState(false);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (vivo && res && res.value) {
          const g = JSON.parse(res.value);
          setDatos({ ...DEFAULTS, ...(g.datos || {}) });
          if (g.regimen && REGIMENES.some((r) => r.id === g.regimen)) setRegimen(g.regimen);
          if (!g.datos || !g.datos.emisor) setEditando(true);
        } else if (vivo) {
          setEditando(true);
        }
      } catch (e) {
        if (vivo) setEditando(true);
      }
      if (vivo) setCargado(true);
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!cargado) return;
    window.storage.set(STORAGE_KEY, JSON.stringify({ datos, regimen })).catch(() => {});
  }, [datos, regimen, cargado]);

  const total = Number(String(totalTxt).replace(/[^0-9.]/g, "")) || 0;
  const reg = REGIMENES.find((r) => r.id === regimen);

  const calc = useMemo(() => {
    const factor = 1 + TASA_IVA - TASA_RET_IVA - reg.isr;
    const subtotal = r2(r2(total / factor) + ajuste / 100);
    const iva = r6(subtotal * TASA_IVA);
    const retIva = r6(subtotal * TASA_RET_IVA);
    const retIsr = r6(subtotal * reg.isr);
    const totalCalc = r2(subtotal + r2(iva) - r2(retIva) - r2(retIsr));
    const dif = r2(totalCalc - total);
    return { subtotal, iva, retIva, retIsr, totalCalc, dif };
  }, [total, reg, ajuste]);

  const filas = [
    { label: "Subtotal / Valor unitario / Importe del concepto", valor: f2(calc.subtotal), copia: calc.subtotal.toFixed(2) },
    { label: "Base (IVA, Ret. IVA y Ret. ISR)", valor: f6(calc.subtotal), copia: calc.subtotal.toFixed(6) },
    { label: "IVA trasladado 16% – Importe", valor: f6(calc.iva), copia: calc.iva.toFixed(6) },
    { label: "Retención de IVA 10.6667% – Importe", valor: f6(calc.retIva), copia: calc.retIva.toFixed(6) },
  ];
  if (reg.isr > 0) {
    filas.push({ label: "Retención de ISR 1.25% – Importe", valor: f6(calc.retIsr), copia: calc.retIsr.toFixed(6) });
  }

  const cell = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderTop: "1px solid var(--line)", fontSize: 13 };

  return (
    <div className="stagger">
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--gold)", margin: "0 0 4px", fontWeight: 600 }}>Ingresos</p>
        <h2 className="serif" style={{ fontSize: 26, margin: 0, color: "var(--ink)" }}>Calculadora de factura</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
          Escribe solo el total a cobrar y obtén los importes que debe llevar tu CFDI de comisiones.
        </p>
      </div>

      <div className="panel" style={{ padding: 16, marginBottom: 18 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Total a cobrar (con impuestos)</label>
        <input
          inputMode="decimal"
          value={totalTxt}
          onChange={(e) => { setTotalTxt(e.target.value); setAjuste(0); }}
          placeholder="15000.00"
          style={{ width: "100%", padding: "12px 14px", border: "2px solid var(--gold)", borderRadius: 10, fontSize: 22, fontWeight: 600, background: "#fff", color: "var(--ink)", marginBottom: 12 }}
        />
        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>Régimen del emisor</label>
        <select
          value={regimen}
          onChange={(e) => { setRegimen(e.target.value); setAjuste(0); }}
          style={{ width: "100%", padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff", color: "var(--ink)" }}
        >
          {REGIMENES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      <h3 className="serif" style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 10px" }}>Datos para la factura</h3>
      <div className="panel" style={{ overflow: "hidden", marginBottom: 12 }}>
        {filas.map((f) => (
          <div key={f.label} style={{ ...cell, borderTop: f === filas[0] ? "none" : cell.borderTop }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{f.label}</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>{f.valor}</div>
            </div>
            <CopyBtn text={f.copia} />
          </div>
        ))}
        <div style={{ ...cell, background: "var(--cream-2)", borderTop: "2px solid var(--ink)" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>TOTAL de la factura</div>
            <div className="serif" style={{ fontWeight: 700, fontSize: 20, color: "var(--emerald)" }}>${f2(calc.totalCalc)}</div>
          </div>
          <CopyBtn text={calc.totalCalc.toFixed(2)} />
        </div>
      </div>

      {total > 0 && (
        calc.dif === 0 ? (
          <p style={{ fontSize: 12, color: "var(--emerald)", margin: "0 0 18px", fontWeight: 600 }}>✓ El total coincide con lo que escribiste.</p>
        ) : (
          <div style={{ fontSize: 12, color: "#B23A2E", margin: "0 0 18px" }}>
            Diferencia de ${f2(calc.dif)} por redondeo. Ajusta el subtotal un centavo:
            <span style={{ marginLeft: 8, display: "inline-flex", gap: 6 }}>
              <button type="button" onClick={() => setAjuste((a) => a - 1)} style={{ border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: "2px 10px" }}>− 0.01</button>
              <button type="button" onClick={() => setAjuste((a) => a + 1)} style={{ border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: "2px 10px" }}>+ 0.01</button>
            </span>
          </div>
        )
      )}

      <h3 className="serif" style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 10px" }}>Comparativo por régimen</h3>
      <div className="panel" style={{ overflow: "hidden", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.9fr 0.9fr 0.9fr 1fr", background: "var(--ink)", color: "var(--cream)", fontSize: 11, fontWeight: 600, padding: "8px 10px" }}>
          <span>Régimen</span><span>Subtotal</span><span>IVA</span><span>Ret. ISR</span><span>Ret. IVA</span><span>Total</span>
        </div>
        {REGIMENES.map((r) => {
          const sub = r2(total / (1 + TASA_IVA - TASA_RET_IVA - r.isr));
          const iva = r2(sub * TASA_IVA);
          const ri = r2(sub * r.isr);
          const rv = r2(sub * TASA_RET_IVA);
          return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.9fr 0.9fr 0.9fr 1fr", padding: "9px 10px", fontSize: 12, borderTop: "1px solid var(--line)", alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>{r.id === "resico" ? "RESICO" : "PF Act. Empresarial"}</span>
              <span>{f2(sub)}</span>
              <span>{f2(iva)}</span>
              <span>{ri ? `-${f2(ri)}` : "—"}</span>
              <span>-{f2(rv)}</span>
              <span style={{ fontWeight: 600 }}>{f2(r2(sub + iva - ri - rv))}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 10px" }}>
        <h3 className="serif" style={{ fontSize: 14, color: "var(--ink)", margin: 0 }}>Datos fijos de tu factura</h3>
        <button
          type="button"
          onClick={() => setEditando((e) => !e)}
          style={{ background: editando ? "var(--gold)" : "none", color: editando ? "#fff" : "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}
        >
          {editando ? "Listo" : "Editar"}
        </button>
      </div>
      {editando && !datos.emisor && (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px" }}>
          Captura una sola vez tus datos (nombre, RFC y código postal); se guardan en tu cuenta.
        </p>
      )}
      <div className="panel" style={{ overflow: "hidden", marginBottom: 12 }}>
        {CAMPOS.slice(0, 2).concat([{ k: "_regimen", label: "Régimen fiscal emisor", fijo: REG_EMISOR[regimen] }], CAMPOS.slice(2)).map((c, i) => {
          const valor = c.fijo !== undefined ? c.fijo : datos[c.k];
          return (
            <div key={c.k} style={{ ...cell, borderTop: i === 0 ? "none" : cell.borderTop, padding: "8px 12px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.label}</div>
                {editando && c.fijo === undefined ? (
                  <input
                    value={datos[c.k]}
                    placeholder={c.ph || ""}
                    onChange={(e) => setDatos((d) => ({ ...d, [c.k]: c.k === "rfc" ? e.target.value.toUpperCase() : e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff", color: "var(--ink)", marginTop: 2 }}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: valor ? "var(--ink)" : "var(--muted)", wordBreak: "break-word" }}>{valor || "— sin capturar —"}</div>
                )}
              </div>
              {!editando && valor ? <CopyBtn text={valor} /> : null}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 24px" }}>
        Herramienta de cálculo, no asesoría fiscal. Confirma con tu contador cualquier duda sobre tu régimen.
      </p>
    </div>
  );
}
