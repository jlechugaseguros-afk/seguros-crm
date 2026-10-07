import React, { useState, useMemo } from "react";

// Calculadora de factura (CFDI) para comisiones de seguros.
// Se captura solo el TOTAL y se obtienen subtotal, base, IVA y retenciones.

const TASA_IVA = 0.16;
const TASA_RET_IVA = 0.106667; // la que usa el SAT en el XML (2/3 de 16%)
const TASA_RET_ISR_RESICO = 0.0125;

const REGIMENES = [
  { id: "resico", label: "RESICO (Régimen Simplificado de Confianza)", isr: TASA_RET_ISR_RESICO },
  { id: "pfae", label: "PF Actividad Empresarial", isr: 0 },
];

const DATOS_FIJOS = [
  ["Emisor", "JOSHUA LECHUGA PLATA"],
  ["RFC emisor", "LEPJ861115NC9"],
  ["Régimen fiscal emisor", "Régimen Simplificado de Confianza (626)"],
  ["Código postal de expedición", "72990"],
  ["Receptor", "MACOOLEY BROKERS, AGENTE DE SEGUROS"],
  ["RFC receptor", "MBA161004PB9"],
  ["CP receptor", "11520"],
  ["Régimen receptor", "General de Ley Personas Morales"],
  ["Uso CFDI", "Gastos en general (G03)"],
  ["Clave producto/servicio", "80141600"],
  ["Descripción", "COMISIONES NO VIDA"],
  ["Cantidad", "1"],
  ["Clave de unidad", "E48 – Unidad de servicio"],
  ["Objeto de impuesto", "Sí objeto de impuesto"],
  ["Moneda", "Peso Mexicano (MXN)"],
  ["Forma de pago", "03 – Transferencia electrónica de fondos"],
  ["Método de pago", "PUE – Pago en una sola exhibición"],
  ["Efecto del comprobante", "Ingreso"],
];

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

      <h3 className="serif" style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 10px" }}>Datos fijos de tu factura</h3>
      <div className="panel" style={{ overflow: "hidden", marginBottom: 12 }}>
        {DATOS_FIJOS.map(([k, v], i) => (
          <div key={k} style={{ ...cell, borderTop: i === 0 ? "none" : cell.borderTop, padding: "8px 12px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{k}</div>
              <div style={{ fontSize: 13, color: "var(--ink)", wordBreak: "break-word" }}>{v}</div>
            </div>
            <CopyBtn text={v} />
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 24px" }}>
        Herramienta de cálculo, no asesoría fiscal. Confirma con tu contador cualquier duda sobre tu régimen.
      </p>
    </div>
  );
}
