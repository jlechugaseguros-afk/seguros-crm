import React, { useState, useMemo, useEffect } from "react";
import PageHeader from "./PageHeader.jsx";

// Calculadora de deducible y coaseguro (Gastos Médicos Mayores).
// Dos modos: "Manual" (calculadora rápida con el cliente) y "Ligar a cliente"
// (toma/guarda los datos de la póliza y deja el cálculo en el expediente del cliente).
//
// Lógica (igual que el Excel "DEDUCIBLE Y COASEGURO"):
//   base del coaseguro = gastos − deducible
//   coaseguro          = base × %      (con tope: nunca más que el tope de coaseguro)
//   el asegurado paga  = deducible + coaseguro
//   la aseguradora paga = gastos − lo que paga el asegurado

const DEDUCIBLES_RAPIDOS = [11000, 16000, 21000, 31000, 44000];
const COASEGURO_DEF = 10;
const TOPE_DEF = 45000;

const num = (t) => Number(String(t ?? "").replace(/[^0-9.]/g, "")) || 0;
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const f2 = (n) => Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mxn = (n) => `$${f2(n)}`;

export function calcularDyC({ gastos, deducible, coaseguroPct, tope }) {
  const g = Math.max(0, gastos);
  const ded = Math.min(Math.max(0, deducible), g);
  const base = g - ded;
  const coaSinTope = r2(base * (coaseguroPct / 100));
  const topeActivo = tope > 0;
  const coa = topeActivo ? Math.min(coaSinTope, tope) : coaSinTope;
  const topeAplicado = topeActivo && coaSinTope > tope;
  const paga = r2(ded + coa);
  const aseguradora = r2(g - paga);
  const pagaSinTope = r2(ded + coaSinTope);
  return {
    gastos: g, deducible: ded, base, coaSinTope, coaseguro: r2(coa), topeAplicado,
    paga, aseguradora, pctCubierto: g > 0 ? aseguradora / g : 0,
    pagaSinTope, ahorroTope: r2(pagaSinTope - paga),
    maximo: topeActivo ? r2(deducible + tope) : null,
  };
}

function CopyBtn({ text, label = "Copiar resumen" }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    } catch (e) { /* sin permiso de portapapeles */ }
  }
  return (
    <button type="button" onClick={copiar} style={{ ...btn, background: ok ? "var(--emerald)" : "#fff", color: ok ? "#fff" : "var(--ink)" }}>
      {ok ? "Copiado" : label}
    </button>
  );
}

const btn = { border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--ink)", padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: 500 };
const lbl = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4, fontWeight: 500 };
const inp = { width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff", color: "var(--ink)" };

function Campo({ label, children }) {
  return <div style={{ marginBottom: 12 }}><label style={lbl}>{label}</label>{children}</div>;
}

function Fila({ label, valor, fuerte, color, nota }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "10px 12px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: fuerte ? "var(--ink)" : "var(--muted)", fontWeight: fuerte ? 600 : 400 }}>{label}</div>
        {nota && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{nota}</div>}
      </div>
      <div className={fuerte ? "serif" : undefined} style={{ fontWeight: fuerte ? 700 : 600, fontSize: fuerte ? 18 : 14, color: color || "var(--ink)", whiteSpace: "nowrap" }}>{valor}</div>
    </div>
  );
}

export default function CalculadoraDeducible({ clients = [], onUpdateClient }) {
  const [modo, setModo] = useState("manual"); // manual | cliente
  const [tipo, setTipo] = useState("Enfermedad"); // Enfermedad | Accidente
  const [gastosTxt, setGastosTxt] = useState("500000");
  const [dedTxt, setDedTxt] = useState("16000");
  const [coaTxt, setCoaTxt] = useState(String(COASEGURO_DEF));
  const [topeTxt, setTopeTxt] = useState(String(TOPE_DEF));

  const [clienteId, setClienteId] = useState("");
  const [polizaId, setPolizaId] = useState("");
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState("");

  const cliente = clients.find((c) => c.id === clienteId) || null;
  const polizasCliente = useMemo(() => {
    const ps = cliente?.polizas || [];
    const gmm = ps.filter((p) => p.ramo === "GMM");
    return gmm.length ? gmm : ps;
  }, [cliente]);
  const poliza = polizasCliente.find((p) => p.id === polizaId) || null;

  const clientesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = [...clients].sort((a, b) => `${a.nombre} ${a.apellido || ""}`.localeCompare(`${b.nombre} ${b.apellido || ""}`));
    if (!q) return lista;
    return lista.filter((c) => `${c.nombre} ${c.apellido || ""} ${c.telefono || ""}`.toLowerCase().includes(q)
      || (c.polizas || []).some((p) => String(p.numeroPoliza || "").toLowerCase().includes(q)));
  }, [clients, busca]);

  // Al elegir cliente: si solo tiene una póliza candidata, se selecciona sola.
  useEffect(() => {
    if (!cliente) { setPolizaId(""); return; }
    if (polizasCliente.length === 1) setPolizaId(polizasCliente[0].id);
    else if (!polizasCliente.some((p) => p.id === polizaId)) setPolizaId("");
  }, [clienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al elegir póliza: carga deducible / coaseguro / tope guardados en ella.
  useEffect(() => {
    if (!poliza) return;
    if (poliza.deducible) setDedTxt(String(poliza.deducible));
    if (poliza.coaseguroPct !== undefined && poliza.coaseguroPct !== "") setCoaTxt(String(poliza.coaseguroPct));
    if (poliza.topeCoaseguro !== undefined && poliza.topeCoaseguro !== "") setTopeTxt(String(poliza.topeCoaseguro));
  }, [polizaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const gastos = num(gastosTxt);
  const deducible = num(dedTxt);
  const coaseguroPct = Math.min(100, num(coaTxt));
  const tope = num(topeTxt);
  const calc = useMemo(() => calcularDyC({ gastos, deducible, coaseguroPct, tope }), [gastos, deducible, coaseguroPct, tope]);

  function cambiarTipo(t) {
    setTipo(t);
    // Como en el Excel: en accidente el deducible no aplica (editable).
    setDedTxt(t === "Accidente" ? "0" : String(poliza?.deducible || 16000));
  }

  const resumen = [
    `Simulación de gastos médicos (${tipo.toLowerCase()})`,
    cliente ? `Cliente: ${cliente.nombre} ${cliente.apellido || ""}`.trim() : null,
    `Gastos totales: ${mxn(calc.gastos)}`,
    `Deducible: ${mxn(calc.deducible)}`,
    `Coaseguro (${coaseguroPct}%${tope > 0 ? `, tope ${mxn(tope)}` : ""}): ${mxn(calc.coaseguro)}`,
    `Tú pagas: ${mxn(calc.paga)}`,
    `La aseguradora paga: ${mxn(calc.aseguradora)} (${(calc.pctCubierto * 100).toFixed(1)}%)`,
  ].filter(Boolean).join("\n");

  function flash(msg) { setAviso(msg); setTimeout(() => setAviso(""), 2500); }

  function guardarEnPoliza() {
    if (!cliente || !poliza || !onUpdateClient) return;
    onUpdateClient(cliente.id, (c) => ({
      ...c,
      polizas: (c.polizas || []).map((p) => (p.id === poliza.id
        ? { ...p, deducible: deducible, coaseguroPct: coaseguroPct, topeCoaseguro: tope }
        : p)),
    }));
    flash("Deducible, coaseguro y tope guardados en la póliza.");
  }

  function guardarCalculo() {
    if (!cliente || !onUpdateClient) return;
    const registro = {
      id: Date.now().toString(),
      fecha: new Date().toISOString().slice(0, 10),
      polizaId: poliza?.id || null,
      numeroPoliza: poliza?.numeroPoliza || "",
      tipo, gastos: calc.gastos, deducible: calc.deducible, coaseguroPct, tope,
      paga: calc.paga, aseguradora: calc.aseguradora,
    };
    onUpdateClient(cliente.id, (c) => ({ ...c, calculos: [registro, ...(c.calculos || [])] }));
    flash("Cálculo guardado en el expediente del cliente.");
  }

  function borrarCalculo(id) {
    onUpdateClient(cliente.id, (c) => ({ ...c, calculos: (c.calculos || []).filter((x) => x.id !== id) }));
  }

  const tabBtn = (id, texto) => (
    <button
      type="button"
      onClick={() => setModo(id)}
      style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--line)", background: modo === id ? "var(--ink)" : "#fff", color: modo === id ? "var(--cream)" : "var(--ink)", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: id === "manual" ? "10px 0 0 10px" : "0 10px 10px 0" }}
    >
      {texto}
    </button>
  );

  return (
    <div className="stagger">
      <PageHeader eyebrow="Gastos médicos mayores" title="Deducible y coaseguro" subtitle="Explica con números cuánto paga el cliente y cuánto la aseguradora en un siniestro." />

      <div style={{ display: "flex", marginBottom: 16 }}>
        {tabBtn("manual", "Cálculo manual")}
        {tabBtn("cliente", "Ligar a cliente")}
      </div>

      {modo === "cliente" && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <Campo label="Buscar cliente (nombre, teléfono o número de póliza)">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Escribe para filtrar…" style={inp} />
          </Campo>
          <Campo label="Cliente">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={inp}>
              <option value="">— Elige un cliente —</option>
              {clientesFiltrados.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ""}</option>)}
            </select>
          </Campo>
          {cliente && (
            polizasCliente.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Este cliente aún no tiene pólizas capturadas. Puedes calcular y guardar el resultado en su expediente de todos modos.</p>
            ) : (
              <Campo label="Póliza">
                <select value={polizaId} onChange={(e) => setPolizaId(e.target.value)} style={inp}>
                  <option value="">— Elige una póliza —</option>
                  {polizasCliente.map((p) => <option key={p.id} value={p.id}>{p.aseguradora} · {p.ramo} · {p.numeroPoliza || "sin número"}</option>)}
                </select>
              </Campo>
            )
          )}
        </div>
      )}

      <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["Enfermedad", "Accidente"].map((t) => (
            <button key={t} type="button" onClick={() => cambiarTipo(t)} style={{ ...btn, flex: 1, background: tipo === t ? "var(--gold)" : "#fff", color: tipo === t ? "#fff" : "var(--ink)", fontWeight: 600 }}>{t}</button>
          ))}
        </div>

        <Campo label="Gastos totales del siniestro">
          <input inputMode="decimal" value={gastosTxt} onChange={(e) => setGastosTxt(e.target.value)} placeholder="500000" style={{ ...inp, border: "2px solid var(--gold)", fontSize: 22, fontWeight: 600, padding: "12px 14px" }} />
        </Campo>

        <Campo label="Deducible">
          <input inputMode="decimal" value={dedTxt} onChange={(e) => setDedTxt(e.target.value)} style={inp} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {DEDUCIBLES_RAPIDOS.map((d) => (
              <button key={d} type="button" onClick={() => setDedTxt(String(d))} style={{ ...btn, padding: "4px 10px", background: deducible === d ? "var(--ink)" : "#fff", color: deducible === d ? "var(--cream)" : "var(--ink)" }}>{mxn(d).replace(".00", "")}</button>
            ))}
            <button type="button" onClick={() => setDedTxt("0")} style={{ ...btn, padding: "4px 10px" }}>Sin deducible</button>
          </div>
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo label="Coaseguro (%)">
            <input inputMode="decimal" value={coaTxt} onChange={(e) => setCoaTxt(e.target.value)} style={inp} />
          </Campo>
          <Campo label="Tope de coaseguro ($)">
            <input inputMode="decimal" value={topeTxt} onChange={(e) => setTopeTxt(e.target.value)} placeholder="0 = sin tope" style={inp} />
          </Campo>
        </div>
      </div>

      <h3 className="serif" style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 10px" }}>Resultado</h3>
      <div className="panel" style={{ overflow: "hidden", marginBottom: 12 }}>
        <Fila label="Gastos totales" valor={mxn(calc.gastos)} />
        <Fila label="Deducible" valor={mxn(calc.deducible)} nota="Lo pagas tú primero." />
        <Fila label="Base del coaseguro" valor={mxn(calc.base)} nota="Gastos − deducible" />
        <Fila label={`Coaseguro ${coaseguroPct}% sin tope`} valor={mxn(calc.coaSinTope)} />
        <Fila
          label="Coaseguro a pagar"
          valor={mxn(calc.coaseguro)}
          nota={calc.topeAplicado ? `Se aplicó el tope de ${mxn(tope)}.` : tope > 0 ? "No se alcanzó el tope." : "Sin tope."}
        />
        <div style={{ borderTop: "2px solid var(--ink)", background: "var(--cream-2)" }}>
          <Fila label="TÚ PAGAS (deducible + coaseguro)" valor={mxn(calc.paga)} fuerte color="#B23A2E" />
          <Fila label="LA ASEGURADORA PAGA" valor={mxn(calc.aseguradora)} fuerte color="var(--emerald)" nota={`${(calc.pctCubierto * 100).toFixed(2)}% de los gastos`} />
        </div>
      </div>

      {calc.topeAplicado && (
        <p style={{ fontSize: 12, color: "var(--emerald)", margin: "0 0 12px", fontWeight: 600 }}>
          El tope te ahorra {mxn(calc.ahorroTope)}: sin tope pagarías {mxn(calc.pagaSinTope)}.
        </p>
      )}
      {calc.maximo !== null && (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
          Máximo que pagarías en un evento (deducible + tope): <b style={{ color: "var(--ink)" }}>{mxn(calc.maximo)}</b>
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <CopyBtn text={resumen} />
        <a
          href={`https://wa.me/?text=${encodeURIComponent(resumen)}`}
          target="_blank"
          rel="noreferrer"
          style={{ ...btn, textDecoration: "none", display: "inline-block" }}
        >
          Enviar por WhatsApp
        </a>
        {modo === "cliente" && cliente && (
          <>
            {poliza && <button type="button" onClick={guardarEnPoliza} style={btn}>Guardar parámetros en la póliza</button>}
            <button type="button" onClick={guardarCalculo} style={{ ...btn, background: "var(--gold)", color: "#fff", border: "none" }}>Guardar cálculo en el cliente</button>
          </>
        )}
      </div>
      {aviso && <p style={{ fontSize: 12, color: "var(--emerald)", margin: "0 0 12px", fontWeight: 600 }}>✓ {aviso}</p>}

      {modo === "cliente" && cliente && (
        <>
          <h3 className="serif" style={{ fontSize: 14, color: "var(--ink)", margin: "10px 0" }}>Cálculos guardados de {cliente.nombre}</h3>
          <div className="panel" style={{ overflow: "hidden", marginBottom: 18 }}>
            {(cliente.calculos || []).length === 0 ? (
              <div style={{ padding: 14, fontSize: 12, color: "var(--muted)" }}>Aún no hay cálculos guardados.</div>
            ) : (cliente.calculos || []).map((x, i) => (
              <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "10px 12px", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{x.fecha} · {x.tipo}{x.numeroPoliza ? ` · ${x.numeroPoliza}` : ""}</div>
                  <div style={{ color: "var(--muted)" }}>Gastos {mxn(x.gastos)} → pagas {mxn(x.paga)} · aseguradora {mxn(x.aseguradora)}</div>
                </div>
                <button type="button" onClick={() => borrarCalculo(x.id)} style={{ ...btn, color: "#B23A2E", padding: "3px 9px" }}>Borrar</button>
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 24px" }}>
        Simulación informativa. Las condiciones reales (deducible, coaseguro, tope, suma asegurada y exclusiones) son las que marca la póliza contratada.
      </p>
    </div>
  );
}
