import React, { useMemo, useState } from "react";
import { Smartphone, Copy, Check, Send, ChevronDown } from "lucide-react";

// Tarjeta discreta del Dashboard: el agente comparte con sus clientes el enlace de su portal.
// El enlace lleva el id del agente (?a=...) para que cada cliente entre al portal de SU agente.

const limpiaTel = (t) => {
  const d = String(t || "").replace(/\D/g, "");
  return d.length === 10 ? "52" + d : d;
};

export default function PortalClientes({ clients = [], agentId, agenteNombre }) {
  const [copiado, setCopiado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [clienteId, setClienteId] = useState("");

  const link = agentId ? `${window.location.origin}/portal?a=${agentId}` : `${window.location.origin}/portal`;
  const conCorreo = useMemo(() => clients.filter((c) => String(c.correo || "").includes("@")), [clients]);
  const sinCorreo = clients.length - conCorreo.length;
  const pct = clients.length ? Math.round((conCorreo.length / clients.length) * 100) : 0;
  const cliente = conCorreo.find((c) => c.id === clienteId) || null;

  const firma = agenteNombre ? `soy ${agenteNombre}. ` : "";
  const mensajeGeneral = `Hola, ${firma}ya puedes consultar tus pólizas, ver tus pagos y pedirme asesoría desde tu celular en tu portal de clientes: ${link}\nEntra con el correo que tengo registrado; te llegará un enlace, sin contraseñas.`;
  const mensajeCliente = cliente
    ? `Hola ${String(cliente.nombre || "").split(" ")[0]}, ${firma}ya puedes consultar tus pólizas, ver tus pagos y pedirme asesoría desde tu celular en tu portal de clientes: ${link}\nEntra con tu correo (${cliente.correo}); te llegará un enlace, sin contraseñas.`
    : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch (e) { /* sin permiso de portapapeles */ }
  }

  const btn = { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };

  return (
    <section className="panel lift pc-card" style={{ padding: "14px 18px 16px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes pcRing { 0% { box-shadow: 0 0 0 0 rgba(201,151,30,.38); } 70%, 100% { box-shadow: 0 0 0 11px rgba(201,151,30,0); } }
        @keyframes pcSheen { 0%, 70% { transform: translateX(-120%) skewX(-18deg); } 100% { transform: translateX(260%) skewX(-18deg); } }
        @keyframes pcFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        .pc-ico { animation: pcRing 3.4s ease-out infinite; }
        .pc-ico svg { animation: pcFloat 3.4s ease-in-out infinite; }
        .pc-sheen { position: absolute; inset: 0; width: 38%; pointer-events: none; background: linear-gradient(100deg, transparent, rgba(201,151,30,.10), transparent); animation: pcSheen 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .pc-ico, .pc-ico svg, .pc-sheen { animation: none !important; } }
      `}</style>
      <span className="pc-sheen" aria-hidden="true" />
      <div style={{ display: "flex", gap: 12, alignItems: "center", position: "relative" }}>
        <span className="pc-ico" style={{ width: 38, height: 38, borderRadius: 12, background: "var(--gold-soft)", color: "var(--gold-text)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Smartphone size={19} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h3 className="serif" style={{ fontSize: 16, fontWeight: 500 }}>Portal de tus clientes</h3>
          <small style={{ color: "var(--stone)", fontSize: 12 }}>Pólizas, pagos y asesoría desde su celular.</small>
        </div>
      </div>

      <div style={{ margin: "12px 0 10px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 5 }}>
          <span>{conCorreo.length} de {clients.length} clientes ya pueden entrar</span>
          {sinCorreo > 0 && <span>{sinCorreo} sin correo</span>}
        </div>
        <div className="meter"><i className="grow-x" style={{ width: `${pct}%` }} /></div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, position: "relative" }}>
        <button type="button" onClick={copiar} style={btn}>
          {copiado ? <><Check size={14} color="var(--emerald)" /> Copiado</> : <><Copy size={14} /> Copiar enlace</>}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(mensajeGeneral)}`} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none" }}>
          <Send size={14} /> Compartir
        </a>
        <button type="button" onClick={() => setAbierto((v) => !v)} style={{ ...btn, border: "none", background: "none", color: "var(--gold-text)", padding: "7px 4px" }}>
          Enviar a un cliente <ChevronDown size={14} style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>
      </div>

      {abierto && (
        <div style={{ marginTop: 10, display: "grid", gap: 8, position: "relative", animation: "rise .3s cubic-bezier(.2,.7,.2,1)" }}>
          {conCorreo.length === 0 ? (
            <small style={{ color: "var(--stone)", fontSize: 12 }}>Aún no hay clientes con correo. Agrégalo con “Editar” en el cliente para que pueda entrar.</small>
          ) : (
            <>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13, background: "#fff", color: "var(--ink)" }}>
                <option value="">Elige un cliente…</option>
                {conCorreo.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ""}</option>)}
              </select>
              {cliente && (
                <a href={`https://wa.me/${limpiaTel(cliente.telefono)}?text=${encodeURIComponent(mensajeCliente)}`} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none", justifyContent: "center", background: "var(--ink)", color: "#fff", border: "none" }}>
                  <Send size={14} /> Enviar por WhatsApp a {String(cliente.nombre || "").split(" ")[0]}
                </a>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
