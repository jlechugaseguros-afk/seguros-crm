import React, { useEffect, useMemo, useState } from "react";
import { Check, MessageCircle, Phone, RotateCcw, ChevronDown } from "lucide-react";
import PageHeader from "./PageHeader.jsx";
import { InsurerMark } from "./insurerLogos.jsx";
import { useAlmacen } from "./almacen.js";
import { fmtMonto, fmtDateFull, hoyISO, addMonthsStr } from "./pagos.js";
import {
  ESTATUS_RENOVACION, ESTATUS_CERRADOS, VENTANAS, ventanaRenovacion,
  construirCobros, resumenCobros, construirRenovaciones, renovarPoliza, construirVentaCruzada,
  mensajeCobro, mensajeRenovacion, mensajeVentaCruzada, linkWa,
} from "./carteraLogica.js";

const btn = { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "none" };
const btnPrim = { ...btn, background: "var(--ink)", color: "#fff", border: "none" };
const btnWa = { ...btn, background: "#E7F5EC", color: "#1E5C4C", border: "1px solid #BFE0CB" };
const campo = { padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13, background: "#fff", color: "var(--ink)", fontFamily: "inherit" };

function Chip({ activo, onClick, children, color }) {
  return (
    <button type="button" onClick={onClick} style={{
      border: `1px solid ${activo ? (color || "var(--ink)") : "var(--line)"}`, background: activo ? (color || "var(--ink)") : "var(--surface)",
      color: activo ? "#fff" : "var(--ink)", borderRadius: 99, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    }}>{children}</button>
  );
}

function Tarjeta({ titulo, valor, detalle, color }) {
  return (
    <div className="panel" style={{ padding: "12px 14px", borderTop: `3px solid ${color}` }}>
      <small style={{ color: "var(--stone)", fontSize: 12, fontWeight: 600 }}>{titulo}</small>
      <b className="serif" style={{ display: "block", fontSize: 22, color, margin: "2px 0" }}>{valor}</b>
      <small style={{ color: "var(--stone)", fontSize: 12 }}>{detalle}</small>
    </div>
  );
}

function CabezaFila({ client, policy, derecha, abajo }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 10, minWidth: 0, alignItems: "center" }}>
        {policy && <InsurerMark name={policy.aseguradora || "?"} w={44} h={26} radius={7} fontSize={11} />}
        <div style={{ minWidth: 0 }}>
          <b style={{ display: "block", fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.nombre}</b>
          <small style={{ color: "var(--stone)", fontSize: 12 }}>{abajo}</small>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>{derecha}</div>
    </div>
  );
}

function Vacio({ children }) {
  return <p style={{ color: "var(--stone)", fontSize: 13.5, padding: "18px 4px", textAlign: "center" }}>{children}</p>;
}

// ---------------- Cobranza ----------------
function Cobranza({ clients, nombreAgente }) {
  const cob = useAlmacen("cobranza", {});
  const cfg = useAlmacen("cobranzaConfig", { desde: "" });
  const [filtro, setFiltro] = useState("vencidos");
  const [editandoDesde, setEditandoDesde] = useState(false);
  const [desdeTxt, setDesdeTxt] = useState("");

  // Primera vez: se cobra desde hace un mes (lo anterior se toma como historia).
  useEffect(() => {
    if (cfg.cargado && !cfg.valor.desde) cfg.guardar({ desde: addMonthsStr(hoyISO(), -1) });
  }, [cfg.cargado, cfg.valor.desde]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => construirCobros(clients, cob.valor, cfg.valor.desde), [clients, cob.valor, cfg.valor.desde]);
  const res = useMemo(() => resumenCobros(items), [items]);

  const lista = items.filter((i) => {
    if (filtro === "vencidos") return i.estado === "vencido";
    if (filtro === "proximos") return i.estado === "pendiente" && i.dias !== null && i.dias <= 30;
    if (filtro === "pendientes") return i.estado !== "pagado";
    return i.estado === "pagado";
  });
  if (filtro === "cobrados") lista.sort((a, b) => String(b.registro?.fecha || "").localeCompare(String(a.registro?.fecha || "")));

  const marcar = (i) => cob.guardar((v) => ({ ...v, [i.key]: { pagado: true, fecha: hoyISO(), monto: i.pago.monto } }));
  const deshacer = (i) => cob.guardar((v) => { const n = { ...v }; delete n[i.key]; return n; });

  function guardarDesde(e) {
    e.preventDefault();
    const m = desdeTxt.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return;
    cfg.guardar({ desde: `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` });
    setEditandoDesde(false);
  }

  if (!cob.cargado || !cfg.cargado) return <Vacio>{cob.error || "Cargando…"}</Vacio>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <Tarjeta titulo="Vencido sin cobrar" valor={fmtMonto(res.vencidos.monto) || "$0"} detalle={`${res.vencidos.n} pago(s)`} color="#B23A2E" />
        <Tarjeta titulo="Por cobrar · 30 días" valor={fmtMonto(res.proximos.monto) || "$0"} detalle={`${res.proximos.n} pago(s)`} color="#B8892B" />
        <Tarjeta titulo="Cobrado este mes" valor={fmtMonto(res.cobradosMes.monto) || "$0"} detalle={`${res.cobradosMes.n} pago(s)`} color="#1E5C4C" />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Chip activo={filtro === "vencidos"} onClick={() => setFiltro("vencidos")} color="#B23A2E">Vencidos ({res.vencidos.n})</Chip>
        <Chip activo={filtro === "proximos"} onClick={() => setFiltro("proximos")}>Próximos 30 días</Chip>
        <Chip activo={filtro === "pendientes"} onClick={() => setFiltro("pendientes")}>Todos los pendientes</Chip>
        <Chip activo={filtro === "cobrados"} onClick={() => setFiltro("cobrados")} color="#1E5C4C">Cobrados</Chip>
      </div>

      {lista.length === 0 && (
        <Vacio>{filtro === "vencidos" ? "No tienes pagos vencidos. ¡Buen trabajo!" : filtro === "cobrados" ? "Aún no has marcado pagos como cobrados." : "No hay pagos en esta vista."}</Vacio>
      )}

      {lista.map((i) => {
        const vencido = i.estado === "vencido";
        const color = i.estado === "pagado" ? "#1E5C4C" : vencido ? "#B23A2E" : "#B8892B";
        const cuando = i.estado === "pagado" ? `Cobrado ${fmtDateFull(i.registro?.fecha)}` : vencido ? `Venció hace ${Math.abs(i.dias)} día(s)` : i.dias === 0 ? "Vence hoy" : `En ${i.dias} día(s)`;
        return (
          <div key={i.key} className="panel" style={{ padding: 12, display: "grid", gap: 10, borderLeft: `3px solid ${color}` }}>
            <CabezaFila
              client={i.client} policy={i.policy}
              abajo={`${i.policy.numeroPoliza || "Sin número"} · ${i.policy.ramo || ""}${i.pago.total > 1 ? ` · pago ${i.pago.numero} de ${i.pago.total}` : ""}${i.policy.metodoPago === "Domiciliado" ? " · domiciliado" : ""}`}
              derecha={<><b style={{ display: "block", fontSize: 15 }}>{fmtMonto(i.pago.monto) || "—"}</b><small style={{ color, fontWeight: 600, fontSize: 12 }}>{fmtDateFull(i.pago.date)} · {cuando}</small></>}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {i.estado !== "pagado" ? (
                <button type="button" style={btnPrim} onClick={() => marcar(i)}><Check size={15} /> Cobrado</button>
              ) : (
                <button type="button" style={btn} onClick={() => deshacer(i)}><RotateCcw size={14} /> Deshacer</button>
              )}
              {i.estado !== "pagado" && i.client.telefono && (
                <a style={btnWa} href={linkWa(i.client.telefono, mensajeCobro(i, nombreAgente))} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
              )}
              {i.estado !== "pagado" && i.client.telefono && (
                <a style={btn} href={`tel:${String(i.client.telefono).replace(/\D/g, "")}`}><Phone size={14} /> Llamar</a>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 12, color: "var(--stone)", lineHeight: 1.5 }}>
        Los pagos se calculan con la fecha de pago, la prima y el pago fraccionado de cada póliza. Se cobran los pagos desde el <b>{fmtDateFull(cfg.valor.desde)}</b>; lo anterior se toma como historia.{" "}
        {!editandoDesde ? (
          <button type="button" onClick={() => { setDesdeTxt(""); setEditandoDesde(true); }} style={{ background: "none", border: "none", padding: 0, color: "var(--gold-text)", fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>Cambiar fecha</button>
        ) : (
          <form onSubmit={guardarDesde} style={{ display: "inline-flex", gap: 6, marginTop: 6 }}>
            <input value={desdeTxt} onChange={(e) => setDesdeTxt(e.target.value)} placeholder="dd/mm/aaaa" inputMode="numeric" style={{ ...campo, width: 120 }} />
            <button type="submit" style={btnPrim}>Guardar</button>
          </form>
        )}
        {cob.error && <span style={{ color: "#B23A2E" }}> {cob.error}</span>}
      </div>
    </div>
  );
}

// ---------------- Renovaciones ----------------
function Renovaciones({ clients, setClients, nombreAgente }) {
  const ren = useAlmacen("renovaciones", {});
  const [ventana, setVentana] = useState("todas");
  const [verCerradas, setVerCerradas] = useState(false);

  const items = useMemo(() => construirRenovaciones(clients, ren.valor), [clients, ren.valor]);
  const abiertas = items.filter((i) => !ESTATUS_CERRADOS.includes(i.estatus));
  const cerradas = items.filter((i) => ESTATUS_CERRADOS.includes(i.estatus));
  const porVentana = (v) => abiertas.filter((i) => ventanaRenovacion(i.dias) === v);
  const lista = ventana === "todas" ? abiertas : porVentana(ventana);
  const enJuego = abiertas.reduce((n, i) => n + i.prima, 0);
  const renovadas = cerradas.filter((i) => i.estatus === "Renovado").reduce((n, i) => n + i.prima, 0);
  const cuenta = (e) => items.filter((i) => i.estatus === e).length;

  const cambiar = (i, patch) => ren.guardar((v) => ({ ...v, [i.key]: { ...(v[i.key] || {}), ...patch, fecha: hoyISO() } }));

  function cambiarEstatus(i, estatus) {
    cambiar(i, { estatus });
    if (estatus === "Renovado") {
      if (window.confirm("¿Quieres que también actualice la póliza al siguiente año (vigencia, fecha de renovación y de pago)? Si ya lo hiciste a mano, elige Cancelar.")) {
        setClients((cs) => cs.map((c) => (c.id === i.client.id
          ? { ...c, polizas: (c.polizas || []).map((p) => (p.id === i.policy.id ? renovarPoliza(p) : p)) }
          : c)));
      }
    }
  }

  if (!ren.cargado) return <Vacio>{ren.error || "Cargando…"}</Vacio>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <Tarjeta titulo="Prima en juego" valor={fmtMonto(enJuego) || "$0"} detalle={`${abiertas.length} póliza(s) por renovar`} color="#8F5E0B" />
        <Tarjeta titulo="Ya renovada" valor={fmtMonto(renovadas) || "$0"} detalle={`${cuenta("Renovado")} póliza(s)`} color="#1E5C4C" />
        <Tarjeta titulo="No renuevan" valor={String(cuenta("No renueva"))} detalle="póliza(s) perdidas" color="#B23A2E" />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <Chip activo={ventana === "todas"} onClick={() => setVentana("todas")}>Todas ({abiertas.length})</Chip>
        {VENTANAS.map((v) => (
          <Chip key={v.id} activo={ventana === v.id} color={v.color} onClick={() => setVentana(v.id)}>{v.label} ({porVentana(v.id).length})</Chip>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, color: "var(--stone)" }}>
        {["Por contactar", "Contactado", "Cotizado"].map((e) => (
          <span key={e} style={{ background: "var(--cream-2)", borderRadius: 99, padding: "4px 10px", fontWeight: 600 }}>{e}: {abiertas.filter((i) => i.estatus === e).length}</span>
        ))}
      </div>

      {lista.length === 0 && <Vacio>No hay renovaciones en esta ventana. Las pólizas necesitan fecha de renovación o fin de vigencia.</Vacio>}

      {lista.map((i) => <FilaRenovacion key={i.key} i={i} nombreAgente={nombreAgente} onEstatus={(e) => cambiarEstatus(i, e)} onNota={(n) => cambiar(i, { nota: n })} />)}

      {cerradas.length > 0 && (
        <div>
          <button type="button" onClick={() => setVerCerradas((v) => !v)} style={{ ...btn, background: "none" }}>
            Cerradas ({cerradas.length}) <ChevronDown size={14} style={{ transform: verCerradas ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {verCerradas && <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {cerradas.map((i) => <FilaRenovacion key={i.key} i={i} nombreAgente={nombreAgente} cerrada onEstatus={(e) => cambiarEstatus(i, e)} onNota={(n) => cambiar(i, { nota: n })} />)}
          </div>}
        </div>
      )}
      {ren.error && <small style={{ color: "#B23A2E" }}>{ren.error}</small>}
    </div>
  );
}

function FilaRenovacion({ i, nombreAgente, onEstatus, onNota, cerrada }) {
  const v = VENTANAS[ventanaRenovacion(i.dias)];
  const [nota, setNota] = useState(i.nota);
  const cuando = i.dias < 0 ? `Venció hace ${Math.abs(i.dias)} día(s)` : i.dias === 0 ? "Vence hoy" : `Vence en ${i.dias} día(s)`;
  return (
    <div className="panel" style={{ padding: 12, display: "grid", gap: 10, borderLeft: `3px solid ${cerrada ? "var(--line)" : v.color}`, opacity: cerrada ? 0.85 : 1 }}>
      <CabezaFila
        client={i.client} policy={i.policy}
        abajo={`${i.policy.numeroPoliza || "Sin número"} · ${i.policy.ramo || ""}`}
        derecha={<><b style={{ display: "block", fontSize: 15 }}>{fmtMonto(i.prima) || "—"}</b><small style={{ color: v.color, fontWeight: 600, fontSize: 12 }}>{fmtDateFull(i.fecha)} · {cuando}</small></>}
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select value={i.estatus} onChange={(e) => onEstatus(e.target.value)} aria-label="Estatus de la renovación" style={{ ...campo, fontWeight: 600 }}>
          {ESTATUS_RENOVACION.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        {!cerrada && i.client.telefono && (
          <a style={btnWa} href={linkWa(i.client.telefono, mensajeRenovacion(i, nombreAgente))} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
        )}
        {!cerrada && i.client.telefono && <a style={btn} href={`tel:${String(i.client.telefono).replace(/\D/g, "")}`}><Phone size={14} /> Llamar</a>}
      </div>
      <input value={nota} onChange={(e) => setNota(e.target.value)} onBlur={() => { if (nota !== i.nota) onNota(nota); }} placeholder="Nota (ej. pidió cotizar con otra aseguradora)" style={{ ...campo, width: "100%" }} />
    </div>
  );
}

// ---------------- Venta cruzada ----------------
function VentaCruzada({ clients, nombreAgente }) {
  const est = useAlmacen("ventaCruzada", {});
  const [sug, setSug] = useState("todas");
  const [verOfrecidas, setVerOfrecidas] = useState(false);

  const items = useMemo(() => construirVentaCruzada(clients, est.valor), [clients, est.valor]);
  const abiertas = items.filter((i) => i.estado === "abierta");
  const cerradas = items.filter((i) => i.estado !== "abierta");
  const sugeridos = [...new Set(abiertas.map((i) => i.sugerido))];
  const lista = sug === "todas" ? abiertas : abiertas.filter((i) => i.sugerido === sug);

  const marcar = (i, estado) => est.guardar((v) => ({ ...v, [i.key]: { estado, fecha: hoyISO() } }));
  const reabrir = (i) => est.guardar((v) => { const n = { ...v }; delete n[i.key]; return n; });

  if (!est.cargado) return <Vacio>{est.error || "Cargando…"}</Vacio>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--stone)", lineHeight: 1.5 }}>
        Clientes que ya confían en ti y les falta una protección. Son las ventas más fáciles de tu cartera. Ofrece solo lo que de verdad les convenga.
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Chip activo={sug === "todas"} onClick={() => setSug("todas")}>Todas ({abiertas.length})</Chip>
        {sugeridos.map((s) => <Chip key={s} activo={sug === s} onClick={() => setSug(s)}>{s} ({abiertas.filter((i) => i.sugerido === s).length})</Chip>)}
      </div>

      {lista.length === 0 && <Vacio>{clients.length ? "No hay oportunidades pendientes por ahora." : "Cuando captures clientes con sus pólizas, aquí verás qué ofrecerles."}</Vacio>}

      {lista.map((i) => (
        <div key={i.key} className="panel" style={{ padding: 12, display: "grid", gap: 10, borderLeft: "3px solid var(--gold)" }}>
          <CabezaFila
            client={i.client}
            abajo={`Tiene: ${i.tiene.join(", ") || "—"}`}
            derecha={<span style={{ background: "var(--gold-soft)", color: "#6B4A00", fontWeight: 700, fontSize: 12.5, borderRadius: 99, padding: "4px 10px" }}>Ofrecer {i.sugerido}</span>}
          />
          <small style={{ color: "var(--stone)", fontSize: 12.5 }}>{i.motivo}</small>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {i.client.telefono && <a style={btnWa} href={linkWa(i.client.telefono, mensajeVentaCruzada(i, nombreAgente))} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
            <button type="button" style={btnPrim} onClick={() => marcar(i, "ofrecida")}><Check size={15} /> Ya ofrecí</button>
            <button type="button" style={btn} onClick={() => marcar(i, "descartada")}>No aplica</button>
          </div>
        </div>
      ))}

      {cerradas.length > 0 && (
        <div>
          <button type="button" onClick={() => setVerOfrecidas((v) => !v)} style={{ ...btn, background: "none" }}>
            Ofrecidas o descartadas ({cerradas.length}) <ChevronDown size={14} style={{ transform: verOfrecidas ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {verOfrecidas && <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {cerradas.map((i) => (
              <div key={i.key} className="panel" style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ minWidth: 0, fontSize: 13.5 }}><b>{i.client.nombre}</b> · {i.sugerido}<small style={{ display: "block", color: "var(--stone)" }}>{i.estado === "ofrecida" ? "Ofrecida" : "Descartada"} {fmtDateFull(i.registro?.fecha)}</small></span>
                <button type="button" style={btn} onClick={() => reabrir(i)}><RotateCcw size={14} /> Reabrir</button>
              </div>
            ))}
          </div>}
        </div>
      )}
      {est.error && <small style={{ color: "#B23A2E" }}>{est.error}</small>}
    </div>
  );
}

// ---------------- Pestaña ----------------
export default function CarteraAccion({ clients, setClients, profile, vistaInicial = "cobranza" }) {
  const [vista, setVista] = useState(vistaInicial);
  const nombreAgente = profile?.nombre || "";
  const cobros = useMemo(() => construirCobros(clients, {}, addMonthsStr(hoyISO(), -1)).filter((i) => i.estado === "vencido").length, [clients]);
  const tabs = [
    { id: "cobranza", label: "Cobranza", badge: cobros },
    { id: "renovaciones", label: "Renovaciones" },
    { id: "cruzada", label: "Venta cruzada" },
  ];
  return (
    <div className="stagger">
      <PageHeader eyebrow="Trabajo" title="Cobranza y renovaciones" subtitle="Cuánto dinero está por cobrar, qué pólizas vencen pronto y a qué clientes ofrecerles más." />
      <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setVista(t.id)} style={{
            background: "none", border: "none", padding: "8px 12px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit",
            color: vista === t.id ? "var(--ink)" : "var(--stone)", borderBottom: vista === t.id ? "2px solid #C98A2C" : "2px solid transparent",
          }}>{t.label}{t.badge ? <span style={{ marginLeft: 6, background: "#B23A2E", color: "#fff", borderRadius: 99, fontSize: 11, padding: "1px 7px" }}>{t.badge}</span> : null}</button>
        ))}
      </div>
      {vista === "cobranza" && <Cobranza clients={clients} nombreAgente={nombreAgente} />}
      {vista === "renovaciones" && <Renovaciones clients={clients} setClients={setClients} nombreAgente={nombreAgente} />}
      {vista === "cruzada" && <VentaCruzada clients={clients} nombreAgente={nombreAgente} />}
    </div>
  );
}
