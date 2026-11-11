import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { invocarAcceso } from "./snte/SnteEspacio.jsx";

// Pantalla de acceso con la misma clave de asesor que se usa en Espacio SNTE.
// - Si la cuenta ya está ligada a un asesor (ya entró al Espacio SNTE): pide solo la clave.
// - Si todavía no: pide correo de McBrokers + clave (y con eso queda ligada, igual que en SNTE).
// El acceso se recuerda mientras dure la sesión del navegador.

const MENSAJES = {
  credenciales: "Clave de asesor incorrecta.",
  bloqueado: "Demasiados intentos. Espera unos minutos y vuelve a intentar.",
  datos_invalidos: "Revisa tu clave de asesor.",
  sesion: "Tu sesión expiró. Vuelve a iniciar sesión.",
  sin_vinculo: "Tu cuenta aún no está ligada a un asesor. Escribe también tu correo de McBrokers.",
  error: "No se pudo validar el acceso. Intenta de nuevo.",
};

const inputStyle = {
  width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid var(--line)",
  fontSize: 15, background: "#fff", boxSizing: "border-box",
};

export default function ClaveAsesorGate({ userId, children }) {
  const claveSesion = `tarjeta_mcb_ok_${userId || "x"}`;
  const [ok, setOk] = useState(() => {
    try { return !!sessionStorage.getItem(claveSesion); } catch { return false; }
  });
  const [vinculado, setVinculado] = useState(null); // null = consultando
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (ok) return;
    let vigente = true;
    invocarAcceso({ accion: "estado" }).then((r) => {
      if (vigente) setVinculado(r.ok ? !!r.vinculado : false);
    });
    return () => { vigente = false; };
  }, [ok]);

  function entrar(nombre) {
    try { sessionStorage.setItem(claveSesion, nombre || "Asesor"); } catch { /* sin sessionStorage */ }
    setOk(true);
  }

  async function enviar(e) {
    e.preventDefault();
    setError("");
    if (!clave.trim() || (!vinculado && !correo.trim())) {
      setError(vinculado ? "Escribe tu clave de asesor." : "Escribe tu correo y tu clave de asesor.");
      return;
    }
    setEnviando(true);
    const r = vinculado
      ? await invocarAcceso({ accion: "verificar", clave })
      : await invocarAcceso({ accion: "entrar", correo, clave });
    setEnviando(false);
    if (!r.ok) {
      if (r.error === "sin_vinculo") setVinculado(false);
      let m = MENSAJES[r.error] || MENSAJES.error;
      if (r.error === "credenciales" && !vinculado) m = "Correo o clave de asesor incorrectos.";
      if (r.error === "credenciales" && typeof r.restantes === "number") m += ` Te quedan ${r.restantes} intento${r.restantes === 1 ? "" : "s"}.`;
      setError(m);
      return;
    }
    entrar(r.nombre);
  }

  if (ok) return children;

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "var(--ink)" }}>
        <Lock size={18} />
        <strong style={{ fontSize: 16 }}>Acceso para asesores MCB</strong>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--muted, #5b6770)" }}>
        {vinculado === false
          ? "Escribe tu correo de McBrokers y tu clave de asesor (la misma de Espacio SNTE) para entrar."
          : "Escribe tu clave de asesor (la misma de Espacio SNTE) para entrar."}
      </p>
      {vinculado === null ? (
        <p style={{ fontSize: 13.5 }}>Validando…</p>
      ) : (
        <form onSubmit={enviar}>
          {!vinculado && (
            <>
              <label htmlFor="tmcb-correo" style={{ fontSize: 13, fontWeight: 600 }}>Correo</label>
              <input id="tmcb-correo" style={{ ...inputStyle, marginBottom: 12 }} type="email" autoComplete="off" autoCapitalize="none"
                placeholder="nombre@mcbrokers.com.mx" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </>
          )}
          <label htmlFor="tmcb-clave" style={{ fontSize: 13, fontWeight: 600 }}>Clave de asesor</label>
          <input id="tmcb-clave" style={inputStyle} type="password" inputMode="numeric" autoComplete="off"
            placeholder="Clave de asesor" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus />
          {error && <p role="alert" style={{ color: "#B23A2E", fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
          <button type="submit" disabled={enviando}
            style={{ width: "100%", marginTop: 16, padding: "11px 14px", borderRadius: 10, border: "none", background: "var(--ink)", color: "var(--cream)", fontWeight: 700, fontSize: 14 }}>
            {enviando ? "Validando…" : "Entrar"}
          </button>
        </form>
      )}
    </div>
  );
}
