import React, { useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { JL_LOGO } from "./brandAssets.js";

// Cambia VERSION_AVISO cuando se modifique el texto: a todos los agentes se les pedirá aceptar de nuevo.
export const VERSION_AVISO = "2026-11-09";
export const CLAVE_ACEPTACION = "aceptaTerminos";

// Pon aquí el correo o teléfono para ejercer derechos sobre los datos personales (ARCO). Si se deja vacío se indica "con tu administrador".
const CONTACTO_PRIVACIDAD = "";

const h = { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 15, color: "var(--ink)", margin: "16px 0 6px" };
const p = { fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", margin: "0 0 8px" };
const ul = { fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", margin: "0 0 8px", paddingLeft: 20, display: "grid", gap: 4 };

const contacto = CONTACTO_PRIVACIDAD || "con tu administrador de J L Consultoría Patrimonial";

// Texto para agentes que usan el CRM.
export function AvisoAgentes() {
  return (
    <div>
      <h3 style={{ ...h, marginTop: 0 }}>Aviso de privacidad y términos de uso</h3>
      <p style={p}>J L Consultoría Patrimonial (en adelante, “J L CRM”) pone a tu disposición esta plataforma para administrar tu cartera de clientes, pólizas, prospectos y comisiones. Este documento explica cómo se tratan los datos y qué se espera de cada agente.</p>

      <h3 style={h}>1. Datos que se tratan</h3>
      <ul style={ul}>
        <li><b>Tus datos como agente:</b> nombre, correo, teléfono, foto y la información que captures en tu perfil y tarjeta digital.</li>
        <li><b>Datos de tus clientes y prospectos</b> que tú capturas: identificación, contacto, fechas, pólizas, comprobantes, facturas y, en su caso, información de salud o patrimonial (datos sensibles).</li>
        <li><b>Datos de uso:</b> qué pestañas se abren y con qué frecuencia, para mejorar la plataforma. No se registra el contenido que consultas.</li>
      </ul>

      <h3 style={h}>2. Para qué se usan</h3>
      <p style={p}>Exclusivamente para operar el CRM: mostrar tu información, enviar recordatorios y avisos, generar documentos y respaldar tus datos. No se venden ni se comparten con terceros ajenos al servicio.</p>

      <h3 style={h}>3. Quién es responsable de los datos de tus clientes</h3>
      <p style={p}>Tú, como agente, eres quien decide qué datos de tus clientes captura y para qué. J L CRM solo los almacena y protege por cuenta tuya. Por eso te comprometes a:</p>
      <ul style={ul}>
        <li>Contar con el aviso de privacidad y, cuando se trate de datos sensibles (como salud), con el <b>consentimiento expreso</b> de cada cliente antes de capturar su información.</li>
        <li>Capturar solo lo necesario para atender su seguro.</li>
        <li>Usar la información únicamente para su asesoría y servicio.</li>
        <li>Atender las solicitudes de tus clientes para acceder, corregir o eliminar sus datos.</li>
      </ul>

      <h3 style={h}>4. Seguridad</h3>
      <ul style={ul}>
        <li>No compartas tu contraseña ni la dejes guardada en equipos ajenos; cierra sesión en dispositivos compartidos.</li>
        <li>Cada agente solo puede ver su propia cartera. Los documentos se guardan en almacenamiento privado.</li>
        <li>Tu información se respalda automáticamente cada día y puedes descargar una copia desde Ajustes.</li>
        <li>Si sospechas un acceso indebido, avisa de inmediato a tu administrador.</li>
      </ul>

      <h3 style={h}>5. Tus derechos</h3>
      <p style={p}>Puedes acceder, rectificar o cancelar tus datos, oponerte a su uso o revocar este consentimiento escribiendo {contacto}. Al dar de baja tu cuenta, tus datos se entregan o eliminan según lo que corresponda.</p>

      <h3 style={h}>6. Cambios</h3>
      <p style={p}>Si este aviso cambia, se te pedirá aceptarlo de nuevo la próxima vez que entres. Versión: {VERSION_AVISO}.</p>
    </div>
  );
}

// Texto corto para clientes del portal.
export function AvisoClientes() {
  return (
    <div>
      <h3 style={{ ...h, marginTop: 0 }}>Aviso de privacidad</h3>
      <p style={p}>Tu agente de seguros utiliza esta plataforma para mostrarte tus pólizas, recordatorios de pago y renovación, y la información para reportar siniestros.</p>
      <h3 style={h}>Datos que se tratan</h3>
      <p style={p}>Tus datos de contacto, los de tus pólizas y los documentos que tu agente haya registrado para atenderte.</p>
      <h3 style={h}>Para qué se usan</h3>
      <p style={p}>Solo para darte servicio y asesoría sobre tus seguros. No se venden ni se comparten con terceros ajenos al servicio.</p>
      <h3 style={h}>Tus derechos</h3>
      <p style={p}>Puedes pedir a tu agente que consulte, corrija o elimine tus datos, o que deje de usarlos. También puedes escribir {contacto}.</p>
    </div>
  );
}

// Ventana para leer el aviso (login y portal).
export function AvisoModal({ onClose, tipo = "agentes" }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Aviso de privacidad" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(11,42,68,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--surface, #fff)", borderRadius: 16, maxWidth: 560, width: "100%", maxHeight: "88dvh", display: "flex", flexDirection: "column", boxShadow: "0 30px 60px -20px rgba(11,42,68,.55)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 8px 18px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "var(--ink)", fontSize: 14 }}><ShieldCheck size={16} /> Privacidad</span>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", color: "var(--ink)", padding: 6 }}><X size={20} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: "0 18px 18px", overscrollBehavior: "contain" }}>
          {tipo === "clientes" ? <AvisoClientes /> : <AvisoAgentes />}
        </div>
      </div>
    </div>
  );
}

// Pantalla que se muestra al entrar cuando el agente aún no acepta la versión vigente.
export function AceptarTerminos({ onAceptar, onSalir, guardando, error }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="min-h-dvh" style={{ fontFamily: "'Manrope', system-ui, sans-serif", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, maxWidth: 560, width: "100%", maxHeight: "94dvh", display: "flex", flexDirection: "column", boxShadow: "0 24px 50px -24px rgba(11,42,68,.4)" }}>
        <div style={{ textAlign: "center", padding: "16px 16px 6px" }}>
          <img src={JL_LOGO} alt="J L Consultoría Patrimonial" style={{ height: 48, objectFit: "contain" }} />
        </div>
        <div style={{ overflowY: "auto", padding: "4px 20px 10px", overscrollBehavior: "contain" }}>
          <AvisoAgentes />
        </div>
        <div style={{ padding: "12px 20px 18px", borderTop: "1px solid var(--line)" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)", marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
            <span>He leído el aviso de privacidad y acepto los términos de uso. Me comprometo a contar con el consentimiento de mis clientes para capturar sus datos.</span>
          </label>
          {error && <p style={{ color: "#B23A2E", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={!ok || guardando} onClick={onAceptar}
              style={{ flex: 1, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 14, fontFamily: "inherit", opacity: !ok || guardando ? 0.5 : 1 }}>
              {guardando ? "Guardando…" : "Aceptar y continuar"}
            </button>
            <button type="button" onClick={onSalir}
              style={{ background: "none", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: 10, padding: "12px 16px", fontWeight: 600, fontSize: 14, fontFamily: "inherit" }}>
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
