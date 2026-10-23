import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Download, Pencil, ArrowLeft, Save, FileSpreadsheet, ShieldCheck, UserRound } from "lucide-react";
import * as XLSX from "xlsx";
import PageHeader from "./PageHeader.jsx";

// VidaMas: captura de la "Solicitud de datos para póliza" dentro del CRM y descarga a Excel.
// Las solicitudes se guardan por agente en app_data (clave "vidamas_solicitudes").
// Por seguridad, el número completo de tarjeta y su vencimiento NO se guardan: solo los últimos 4 dígitos.
const KEY = "vidamas_solicitudes";
const ESTADOS_CIVILES = ["Soltero(a)", "Casado(a)", "Unión libre", "Divorciado(a)", "Viudo(a)"];
const PLANES = ["Esencial", "Salud", "Accidentes", "Integral"];
const PERIODOS = ["Quincenal", "Mensual", "Anual"];
const CONDUCTOS = ["Tarjeta de crédito", "Tarjeta de débito"];
const ESTADOS_MX = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"];
const N_BENEF = 5;

const campo = { width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "#fff", color: "var(--ink)", fontFamily: "inherit" };
const etiqueta = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 };
const btn = { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", borderRadius: 10, padding: "8px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnOscuro = { ...btn, background: "var(--ink)", color: "#fff", border: "none" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 };
const completo = { gridColumn: "1 / -1" };

const soloDigitos = (s, n) => String(s || "").replace(/\D/g, "").slice(0, n);
const mascaraFecha = (s) => {
  const d = soloDigitos(s, 8);
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const mascaraVenc = (s) => {
  const d = soloDigitos(s, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const mascaraTarjeta = (s) => soloDigitos(s, 16).replace(/(.{4})(?=.)/g, "$1 ");
const numero = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const dinero = (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const hoyTexto = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };
const slug = (s) => String(s || "solicitud").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "solicitud";
const fechaArchivo = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const vacia = () => ({
  id: `vm-${Date.now()}`,
  creado: hoyTexto(),
  clienteId: "",
  datos: { nombre: "", rfc: "", lugarNacimiento: "", estadoCivil: "", estatura: "", peso: "", domicilio: "", colonia: "", cp: "", municipio: "", estado: "", tel1: "", email: "", tel2: "", curp: "" },
  beneficiarios: Array.from({ length: N_BENEF }, () => ({ nombre: "", parentesco: "", sa: "", fechaNac: "" })),
  banco: { inicioCobro: "", banco: "", tarjetaUltimos4: "", clabe: "", conducto: "" },
  laboral: { dependencia: "", estado: "", cp: "", ocupacion: "", detalle: "", ingresoMensual: "", otrosIngresos: "" },
  plan: { plan: "", sumaAsegurada: "", primaSeguro: "", periodo: "", primaExcedente: "", primaTotal: "" },
});

const primaTotalDe = (p) => numero(p.primaSeguro) + numero(p.primaExcedente);
const totalBenef = (bs) => bs.reduce((t, b) => t + numero(b.sa), 0);
const tarjetaTexto = (banco, completa) => (completa ? mascaraTarjeta(completa) : banco.tarjetaUltimos4 ? `**** **** **** ${banco.tarjetaUltimos4}` : "");

// ---------- Exportación a Excel ----------
function fichaExcel(s, tarjetaCompleta, vencimiento) {
  const filas = [];
  const merges = [];
  const dinerosCeldas = [];
  const titulo = (t) => { merges.push({ s: { r: filas.length, c: 0 }, e: { r: filas.length, c: 3 } }); filas.push([t, "", "", ""]); };
  const par = (l1, v1, l2, v2) => filas.push([l1, v1 ?? "", l2 ?? "", v2 ?? ""]);
  const ancho = (l, v) => { merges.push({ s: { r: filas.length, c: 1 }, e: { r: filas.length, c: 3 } }); filas.push([l, v ?? "", "", ""]); };
  const dineroPar = (l1, v1, l2, v2) => {
    const r = filas.length;
    const a = v1 === "" || v1 == null ? "" : numero(v1);
    const b = v2 === "" || v2 == null ? "" : numero(v2);
    if (a !== "") dinerosCeldas.push([r, 1]);
    if (b !== "") dinerosCeldas.push([r, 3]);
    filas.push([l1, a, l2 ?? "", b]);
  };
  const d = s.datos, b = s.banco, l = s.laboral, p = s.plan;

  titulo("SOLICITUD DE DATOS PARA PÓLIZA · VidaMas");
  par("Fecha de captura", s.creado, "", "");
  filas.push(["", "", "", ""]);
  titulo("DATOS PERSONALES");
  ancho("Nombre", d.nombre);
  par("RFC", d.rfc, "Lugar de nacimiento", d.lugarNacimiento);
  par("Estado civil", d.estadoCivil, "", "");
  par("Estatura", d.estatura, "Peso", d.peso);
  ancho("Domicilio", d.domicilio);
  par("Colonia", d.colonia, "C.P.", d.cp);
  par("Municipio", d.municipio, "Estado", d.estado);
  par("Tel 1", d.tel1, "Email", d.email);
  par("Tel 2", d.tel2, "CURP", d.curp);
  filas.push(["", "", "", ""]);
  titulo("BENEFICIARIOS");
  filas.push(["Nombre", "Parentesco", "S.A. (%)", "Fecha de nacimiento (dd/mm/aaaa)"]);
  s.beneficiarios.filter((x) => x.nombre || x.parentesco || x.sa || x.fechaNac).forEach((x) => {
    filas.push([x.nombre, x.parentesco, x.sa === "" ? "" : numero(x.sa), x.fechaNac]);
  });
  filas.push(["", "", "", ""]);
  titulo("INFORMACIÓN BANCARIA");
  par("Fecha de inicio de cobro", b.inicioCobro, "Banco", b.banco);
  par("Número de tarjeta", tarjetaTexto(b, tarjetaCompleta), "Fecha de vencimiento", vencimiento || "");
  par("CLABE", b.clabe, "Conducto de pago", b.conducto);
  filas.push(["", "", "", ""]);
  titulo("DATOS LABORALES");
  par("Dependencia", l.dependencia, "Estado", l.estado);
  par("C.P.", l.cp, "Ocupación", l.ocupacion);
  ancho("Detalle de la ocupación", l.detalle);
  dineroPar("Ingreso mensual", l.ingresoMensual, "Otros ingresos", l.otrosIngresos);
  filas.push(["", "", "", ""]);
  titulo("PLAN");
  par("Plan", p.plan, "Periodo de pago", p.periodo);
  dineroPar("Suma asegurada", p.sumaAsegurada, "Prima de seguro", p.primaSeguro);
  dineroPar("Prima excedente", p.primaExcedente, "Prima total", primaTotalDe(p));

  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 26 }, { wch: 34 }, { wch: 26 }, { wch: 34 }];
  dinerosCeldas.forEach(([r, c]) => { const ref = XLSX.utils.encode_cell({ r, c }); if (ws[ref]) ws[ref].z = '"$"#,##0.00'; });
  return ws;
}

function descargarFicha(s, tarjetaCompleta, vencimiento) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, fichaExcel(s, tarjetaCompleta, vencimiento), "Solicitud");
  XLSX.writeFile(wb, `vidamas-${slug(s.datos.nombre)}-${fechaArchivo()}.xlsx`);
}

function descargarTodas(lista) {
  const solicitudes = lista.map((s) => {
    const d = s.datos, b = s.banco, l = s.laboral, p = s.plan;
    return {
      "Fecha de captura": s.creado,
      "Nombre": d.nombre, "RFC": d.rfc, "CURP": d.curp, "Lugar de nacimiento": d.lugarNacimiento, "Estado civil": d.estadoCivil,
      "Estatura": d.estatura, "Peso": d.peso, "Domicilio": d.domicilio, "Colonia": d.colonia, "C.P.": d.cp, "Municipio": d.municipio, "Estado": d.estado,
      "Tel 1": d.tel1, "Tel 2": d.tel2, "Email": d.email,
      "Inicio de cobro": b.inicioCobro, "Banco": b.banco, "Tarjeta": tarjetaTexto(b, ""), "CLABE": b.clabe, "Conducto de pago": b.conducto,
      "Dependencia": l.dependencia, "Estado (laboral)": l.estado, "C.P. (laboral)": l.cp, "Ocupación": l.ocupacion, "Detalle de la ocupación": l.detalle,
      "Ingreso mensual": l.ingresoMensual === "" ? "" : numero(l.ingresoMensual), "Otros ingresos": l.otrosIngresos === "" ? "" : numero(l.otrosIngresos),
      "Plan": p.plan, "Periodo de pago": p.periodo,
      "Suma asegurada": p.sumaAsegurada === "" ? "" : numero(p.sumaAsegurada), "Prima de seguro": p.primaSeguro === "" ? "" : numero(p.primaSeguro),
      "Prima excedente": p.primaExcedente === "" ? "" : numero(p.primaExcedente), "Prima total": primaTotalDe(p),
    };
  });
  const beneficiarios = [];
  lista.forEach((s) => s.beneficiarios.filter((x) => x.nombre || x.parentesco || x.sa || x.fechaNac).forEach((x) => {
    beneficiarios.push({ "Solicitante": s.datos.nombre, "Beneficiario": x.nombre, "Parentesco": x.parentesco, "S.A. (%)": x.sa === "" ? "" : numero(x.sa), "Fecha de nacimiento": x.fechaNac });
  }));
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(solicitudes);
  ws1["!cols"] = Object.keys(solicitudes[0] || {}).map((k) => ({ wch: Math.max(14, k.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws1, "Solicitudes");
  const ws2 = XLSX.utils.json_to_sheet(beneficiarios.length ? beneficiarios : [{ "Solicitante": "", "Beneficiario": "", "Parentesco": "", "S.A. (%)": "", "Fecha de nacimiento": "" }]);
  ws2["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Beneficiarios");
  XLSX.writeFile(wb, `vidamas-solicitudes-${fechaArchivo()}.xlsx`);
}

// ---------- Piezas de formulario ----------
function Campo({ label, span, children }) {
  return (
    <div style={span ? completo : undefined}>
      <label style={etiqueta}>{label}</label>
      {children}
    </div>
  );
}

function Texto({ valor, onCambio, ph, modo, mascara, mayus, ...resto }) {
  return (
    <input
      value={valor ?? ""}
      placeholder={ph}
      inputMode={modo}
      style={campo}
      onChange={(e) => { let x = e.target.value; if (mascara) x = mascara(x); if (mayus) x = x.toUpperCase(); onCambio(x); }}
      {...resto}
    />
  );
}

function Opciones({ valor, opciones, onCambio }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {opciones.map((o) => {
        const on = valor === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onCambio(on ? "" : o)}
            style={{ ...btn, background: on ? "var(--ink)" : "var(--surface)", color: on ? "#fff" : "var(--ink)", borderColor: on ? "var(--ink)" : "var(--line)" }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Seccion({ titulo, nota, children }) {
  return (
    <section className="panel" style={{ padding: 16, display: "grid", gap: 12 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 17, fontFamily: "Fraunces, serif", color: "var(--ink)" }}>{titulo}</h3>
        {nota && <small style={{ color: "var(--stone)", fontSize: 12 }}>{nota}</small>}
      </div>
      {children}
    </section>
  );
}

// ---------- Componente principal ----------
export default function VidaMas({ clients = [] }) {
  const [lista, setLista] = useState(null);
  const [edicion, setEdicion] = useState(null);
  const [tarjeta, setTarjeta] = useState("");
  const [venc, setVenc] = useState("");
  const [aviso, setAviso] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(KEY);
        setLista(res && res.value ? JSON.parse(res.value) : []);
      } catch { setLista([]); setErr("No se pudieron cargar las solicitudes. Revisa tu conexión."); }
    })();
  }, []);

  const clientesOrdenados = useMemo(() => [...(clients || [])].sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es")), [clients]);

  async function persistir(nueva) {
    setLista(nueva);
    try { await window.storage.set(KEY, JSON.stringify(nueva)); setErr(""); return true; }
    catch { setErr("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."); return false; }
  }
  function mostrarAviso(t) { setAviso(t); setTimeout(() => setAviso(""), 2200); }

  function nueva() { setEdicion(vacia()); setTarjeta(""); setVenc(""); setErr(""); }
  function abrir(s) { setEdicion(JSON.parse(JSON.stringify(s))); setTarjeta(""); setVenc(""); setErr(""); }
  function cerrar() { setEdicion(null); setTarjeta(""); setVenc(""); }

  async function guardar() {
    if (!edicion.datos.nombre.trim()) { setErr("Escribe el nombre del solicitante para guardar."); return; }
    const registro = {
      ...edicion,
      actualizado: hoyTexto(),
      banco: { ...edicion.banco, tarjetaUltimos4: tarjeta ? soloDigitos(tarjeta, 16).slice(-4) : edicion.banco.tarjetaUltimos4 },
      plan: { ...edicion.plan, primaTotal: primaTotalDe(edicion.plan).toFixed(2) },
    };
    const existe = lista.some((x) => x.id === registro.id);
    const ok = await persistir(existe ? lista.map((x) => (x.id === registro.id ? registro : x)) : [registro, ...lista]);
    if (ok) { setTarjeta(""); setVenc(""); cerrar(); mostrarAviso("Solicitud guardada"); }
  }
  async function eliminar(s) {
    if (window.confirm(`¿Eliminar la solicitud de ${s.datos.nombre || "este solicitante"}? No se puede deshacer.`)) await persistir(lista.filter((x) => x.id !== s.id));
  }

  const set = (sec, k, v) => setEdicion((e) => ({ ...e, [sec]: { ...e[sec], [k]: v } }));
  const setBenef = (i, k, v) => setEdicion((e) => ({ ...e, beneficiarios: e.beneficiarios.map((b, j) => (j === i ? { ...b, [k]: v } : b)) }));

  function tomarCliente(id) {
    const c = clientesOrdenados.find((x) => String(x.id) === String(id));
    if (!c) { setEdicion((e) => ({ ...e, clienteId: "" })); return; }
    setEdicion((e) => ({
      ...e,
      clienteId: String(c.id),
      datos: { ...e.datos, nombre: e.datos.nombre || c.nombre || "", tel1: e.datos.tel1 || c.telefono || "", email: e.datos.email || c.correo || "" },
    }));
  }

  if (!lista) return <p style={{ color: "var(--muted)" }}>Cargando…</p>;

  // ----- Vista de formulario -----
  if (edicion) {
    const d = edicion.datos, b = edicion.banco, l = edicion.laboral, p = edicion.plan;
    const sumaBenef = totalBenef(edicion.beneficiarios);
    const hayBenef = edicion.beneficiarios.some((x) => x.sa);
    const clabeMal = b.clabe && b.clabe.length !== 18;
    return (
      <div className="stagger">
        <PageHeader eyebrow="Herramientas" title="VidaMas" subtitle="Solicitud de datos para póliza: llénala aquí y descárgala en Excel." />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={cerrar} style={btn}><ArrowLeft size={15} /> Volver a la lista</button>
          <button type="button" onClick={guardar} style={btnOscuro}><Save size={15} /> Guardar solicitud</button>
          <button type="button" onClick={() => descargarFicha(edicion, tarjeta, venc)} style={btn}><Download size={15} /> Descargar Excel</button>
          {err && <small style={{ color: "#B23A2E" }}>{err}</small>}
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <section className="panel" style={{ padding: 14, display: "flex", gap: 10, alignItems: "flex-start", background: "var(--gold-soft)" }}>
            <ShieldCheck size={18} color="var(--gold-text)" style={{ flexShrink: 0, marginTop: 2 }} />
            <small style={{ color: "var(--ink)", fontSize: 12.5, lineHeight: 1.5 }}>
              Por seguridad, el número completo de la tarjeta y su vencimiento <b>no se guardan</b> en el CRM: solo los últimos 4 dígitos.
              Aparecen completos en el Excel si lo descargas con esta pantalla abierta, antes de guardar y salir.
            </small>
          </section>

          {clientesOrdenados.length > 0 && (
            <section className="panel" style={{ padding: 14 }}>
              <label style={etiqueta}><UserRound size={13} style={{ verticalAlign: "-2px" }} /> Tomar nombre, teléfono y correo de un cliente (opcional)</label>
              <select value={edicion.clienteId} onChange={(e) => tomarCliente(e.target.value)} style={campo}>
                <option value="">— Elegir cliente —</option>
                {clientesOrdenados.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </section>
          )}

          <Seccion titulo="Datos personales">
            <div style={grid}>
              <Campo label="Nombre *" span><Texto valor={d.nombre} onCambio={(v) => set("datos", "nombre", v)} ph="Nombre completo" /></Campo>
              <Campo label="RFC"><Texto valor={d.rfc} onCambio={(v) => set("datos", "rfc", v)} mayus maxLength={13} /></Campo>
              <Campo label="Lugar de nacimiento"><Texto valor={d.lugarNacimiento} onCambio={(v) => set("datos", "lugarNacimiento", v)} /></Campo>
              <Campo label="Estado civil">
                <select value={d.estadoCivil} onChange={(e) => set("datos", "estadoCivil", e.target.value)} style={campo}>
                  <option value="">—</option>
                  {ESTADOS_CIVILES.map((x) => <option key={x}>{x}</option>)}
                </select>
              </Campo>
              <Campo label="Estatura (m)"><Texto valor={d.estatura} onCambio={(v) => set("datos", "estatura", v)} modo="decimal" ph="1.70" /></Campo>
              <Campo label="Peso (kg)"><Texto valor={d.peso} onCambio={(v) => set("datos", "peso", v)} modo="decimal" ph="70" /></Campo>
              <Campo label="Domicilio" span><Texto valor={d.domicilio} onCambio={(v) => set("datos", "domicilio", v)} ph="Calle y número" /></Campo>
              <Campo label="Colonia"><Texto valor={d.colonia} onCambio={(v) => set("datos", "colonia", v)} /></Campo>
              <Campo label="C.P."><Texto valor={d.cp} onCambio={(v) => set("datos", "cp", soloDigitos(v, 5))} modo="numeric" /></Campo>
              <Campo label="Municipio"><Texto valor={d.municipio} onCambio={(v) => set("datos", "municipio", v)} /></Campo>
              <Campo label="Estado"><Texto valor={d.estado} onCambio={(v) => set("datos", "estado", v)} list="vm-estados" /></Campo>
              <Campo label="Tel 1"><Texto valor={d.tel1} onCambio={(v) => set("datos", "tel1", v)} modo="tel" /></Campo>
              <Campo label="Tel 2"><Texto valor={d.tel2} onCambio={(v) => set("datos", "tel2", v)} modo="tel" /></Campo>
              <Campo label="Email"><Texto valor={d.email} onCambio={(v) => set("datos", "email", v)} modo="email" /></Campo>
              <Campo label="CURP"><Texto valor={d.curp} onCambio={(v) => set("datos", "curp", v)} mayus maxLength={18} /></Campo>
            </div>
            <datalist id="vm-estados">{ESTADOS_MX.map((x) => <option key={x} value={x} />)}</datalist>
          </Seccion>

          <Seccion titulo="Beneficiarios" nota="Hasta 5. S.A. es el porcentaje de la suma asegurada que recibe cada uno.">
            <div style={{ display: "grid", gap: 10 }}>
              {edicion.beneficiarios.map((x, i) => (
                <div key={i} style={{ ...grid, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", padding: "10px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <Campo label={`Beneficiario ${i + 1}`} span><Texto valor={x.nombre} onCambio={(v) => setBenef(i, "nombre", v)} ph="Nombre completo" /></Campo>
                  <Campo label="Parentesco"><Texto valor={x.parentesco} onCambio={(v) => setBenef(i, "parentesco", v)} ph="Ej. Esposa" /></Campo>
                  <Campo label="S.A. (%)"><Texto valor={x.sa} onCambio={(v) => setBenef(i, "sa", v.replace(/[^0-9.]/g, "").slice(0, 6))} modo="decimal" ph="50" /></Campo>
                  <Campo label="Fecha de nacimiento"><Texto valor={x.fechaNac} onCambio={(v) => setBenef(i, "fechaNac", v)} mascara={mascaraFecha} modo="numeric" ph="dd/mm/aaaa" /></Campo>
                </div>
              ))}
            </div>
            {hayBenef && (
              <small style={{ fontWeight: 600, color: Math.abs(sumaBenef - 100) < 0.01 ? "var(--emerald)" : "#B23A2E" }}>
                Suma de porcentajes: {sumaBenef}%{Math.abs(sumaBenef - 100) < 0.01 ? "" : " (debe sumar 100%)"}
              </small>
            )}
          </Seccion>

          <Seccion titulo="Información bancaria">
            <div style={grid}>
              <Campo label="Fecha de inicio de cobro"><Texto valor={b.inicioCobro} onCambio={(v) => set("banco", "inicioCobro", v)} mascara={mascaraFecha} modo="numeric" ph="dd/mm/aaaa" /></Campo>
              <Campo label="Banco"><Texto valor={b.banco} onCambio={(v) => set("banco", "banco", v)} /></Campo>
              <Campo label="Número de tarjeta">
                <Texto valor={tarjeta} onCambio={setTarjeta} mascara={mascaraTarjeta} modo="numeric" ph={b.tarjetaUltimos4 ? `Guardada: •••• ${b.tarjetaUltimos4}` : "0000 0000 0000 0000"} autoComplete="off" />
              </Campo>
              <Campo label="Fecha de vencimiento"><Texto valor={venc} onCambio={setVenc} mascara={mascaraVenc} modo="numeric" ph="MM/AA" autoComplete="off" /></Campo>
              <Campo label="CLABE (18 dígitos)">
                <Texto valor={b.clabe} onCambio={(v) => set("banco", "clabe", soloDigitos(v, 18))} modo="numeric" />
                {clabeMal && <small style={{ color: "#B23A2E" }}>Lleva {b.clabe.length} de 18 dígitos</small>}
              </Campo>
              <Campo label="Conducto de pago" span><Opciones valor={b.conducto} opciones={CONDUCTOS} onCambio={(v) => set("banco", "conducto", v)} /></Campo>
            </div>
          </Seccion>

          <Seccion titulo="Datos laborales">
            <div style={grid}>
              <Campo label="Dependencia"><Texto valor={l.dependencia} onCambio={(v) => set("laboral", "dependencia", v)} /></Campo>
              <Campo label="Estado"><Texto valor={l.estado} onCambio={(v) => set("laboral", "estado", v)} list="vm-estados" /></Campo>
              <Campo label="C.P."><Texto valor={l.cp} onCambio={(v) => set("laboral", "cp", soloDigitos(v, 5))} modo="numeric" /></Campo>
              <Campo label="Ocupación"><Texto valor={l.ocupacion} onCambio={(v) => set("laboral", "ocupacion", v)} /></Campo>
              <Campo label="Detalle de la ocupación" span><Texto valor={l.detalle} onCambio={(v) => set("laboral", "detalle", v)} /></Campo>
              <Campo label="Ingreso mensual ($)"><Texto valor={l.ingresoMensual} onCambio={(v) => set("laboral", "ingresoMensual", v.replace(/[^0-9.]/g, ""))} modo="decimal" /></Campo>
              <Campo label="Otros ingresos ($)"><Texto valor={l.otrosIngresos} onCambio={(v) => set("laboral", "otrosIngresos", v.replace(/[^0-9.]/g, ""))} modo="decimal" /></Campo>
            </div>
          </Seccion>

          <Seccion titulo="Plan">
            <div style={grid}>
              <Campo label="Plan" span><Opciones valor={p.plan} opciones={PLANES} onCambio={(v) => set("plan", "plan", v)} /></Campo>
              <Campo label="Periodo de pago" span><Opciones valor={p.periodo} opciones={PERIODOS} onCambio={(v) => set("plan", "periodo", v)} /></Campo>
              <Campo label="Suma asegurada ($)"><Texto valor={p.sumaAsegurada} onCambio={(v) => set("plan", "sumaAsegurada", v.replace(/[^0-9.]/g, ""))} modo="decimal" /></Campo>
              <Campo label="Prima de seguro ($)"><Texto valor={p.primaSeguro} onCambio={(v) => set("plan", "primaSeguro", v.replace(/[^0-9.]/g, ""))} modo="decimal" /></Campo>
              <Campo label="Prima excedente ($)"><Texto valor={p.primaExcedente} onCambio={(v) => set("plan", "primaExcedente", v.replace(/[^0-9.]/g, ""))} modo="decimal" /></Campo>
              <Campo label="Prima total (prima de seguro + excedente)">
                <div style={{ ...campo, background: "var(--gold-soft)", fontWeight: 700 }}>{dinero(primaTotalDe(p))}</div>
              </Campo>
            </div>
          </Seccion>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={guardar} style={btnOscuro}><Save size={15} /> Guardar solicitud</button>
            <button type="button" onClick={() => descargarFicha(edicion, tarjeta, venc)} style={btn}><Download size={15} /> Descargar Excel</button>
          </div>
        </div>
      </div>
    );
  }

  // ----- Vista de lista -----
  return (
    <div className="stagger">
      <PageHeader eyebrow="Herramientas" title="VidaMas" subtitle="Solicitud de datos para póliza: llénala aquí y descárgala en Excel." />
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={nueva} style={btnOscuro}><Plus size={15} /> Nueva solicitud</button>
        <button type="button" onClick={() => descargarTodas(lista)} disabled={!lista.length} style={{ ...btn, opacity: lista.length ? 1 : 0.5, cursor: lista.length ? "pointer" : "not-allowed" }}>
          <FileSpreadsheet size={15} /> Descargar todas en Excel
        </button>
        {aviso && <small style={{ color: "var(--emerald)", fontWeight: 600 }}>{aviso}</small>}
        {err && <small style={{ color: "#B23A2E" }}>{err}</small>}
      </div>

      {!lista.length ? (
        <section className="panel" style={{ padding: 22, textAlign: "center", color: "var(--muted)" }}>
          Aún no hay solicitudes. Toca “Nueva solicitud” para capturar la primera.
        </section>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {lista.map((s) => (
            <section key={s.id} className="panel" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <b style={{ display: "block", fontSize: 15 }}>{s.datos.nombre || "Sin nombre"}</b>
                <small style={{ color: "var(--stone)", fontSize: 12 }}>
                  {[s.plan.plan && `Plan ${s.plan.plan}`, s.plan.periodo, primaTotalDe(s.plan) ? `Prima total ${dinero(primaTotalDe(s.plan))}` : "", `Capturada ${s.creado}`].filter(Boolean).join(" · ")}
                </small>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => abrir(s)} style={btn}><Pencil size={14} /> Abrir</button>
                <button type="button" onClick={() => descargarFicha(s, "", "")} style={btn}><Download size={14} /> Excel</button>
                <button type="button" aria-label="Eliminar solicitud" onClick={() => eliminar(s)} style={{ ...btn, color: "#B23A2E" }}><Trash2 size={14} /></button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
