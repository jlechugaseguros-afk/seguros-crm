import React, { useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { JL_LOGO } from "./brandAssets.js";

// Cambia VERSION_AVISO cuando se modifique el texto: a todos los agentes se les pedirá aceptar de nuevo.
export const VERSION_AVISO = "2026-11-17";
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

// Aviso adicional de deslinde de responsabilidad y limitación de responsabilidad (agentes).
export function AvisoDeslinde() {
  return (
    <div>
      <h3 style={{ ...h, marginTop: 20 }}>Aviso legal: deslinde y limitación de responsabilidad</h3>
      <p style={p}>Este aviso complementa al de privacidad. Al crear tu cuenta, entrar o seguir usando J L CRM, declaras haberlo leído y aceptarlo. Todo lo aquí previsto aplica en la medida máxima que permitan las leyes mexicanas y no limita responsabilidades que la ley no permita excluir, como las derivadas de dolo o mala fe.</p>

      <h3 style={h}>1. Naturaleza del servicio</h3>
      <p style={p}>J L CRM es una herramienta tecnológica de apoyo, que se ofrece “tal cual” y “según disponibilidad”. No se garantiza que funcione de forma continua, sin errores, sin interrupciones ni libre de fallas, ni que sea adecuada para un fin específico. Puede modificarse, suspenderse o descontinuarse total o parcialmente, con o sin previo aviso, por mantenimiento, mejoras o causas ajenas.</p>

      <h3 style={h}>2. Pérdida, alteración, acceso o filtración de información</h3>
      <p style={p}>J L CRM aplica medidas razonables de seguridad, pero ningún sistema es infalible. J L Consultoría Patrimonial y su titular no serán responsables por la pérdida, alteración, eliminación, acceso no autorizado, divulgación o filtración de información cuando se origine en:</p>
      <ul style={ul}>
        <li>Fallas, interrupciones o incidentes de seguridad de proveedores de infraestructura y servicios de terceros (como alojamiento, base de datos, almacenamiento, autenticación, correo, notificaciones, Google, WhatsApp u otros).</li>
        <li>Ataques informáticos, malware, virus, intrusiones o actos de terceros, aun cuando se hayan aplicado medidas razonables de protección.</li>
        <li>Uso inadecuado de la cuenta: contraseñas débiles, compartidas, expuestas o guardadas en equipos ajenos; sesiones abiertas; dispositivos perdidos, robados, sin bloqueo o infectados; o engaños (phishing) hacia el propio usuario.</li>
        <li>Capturas, descargas, impresiones, envíos por WhatsApp o correo, o archivos exportados por el agente, que quedan bajo su exclusiva responsabilidad una vez fuera de la plataforma.</li>
        <li>Errores, omisiones o captura indebida de datos por parte del usuario, o su eliminación voluntaria o accidental.</li>
        <li>Caso fortuito o fuerza mayor: desastres, cortes de energía o de internet, fallas generalizadas de servicios en la nube, órdenes de autoridad, entre otros.</li>
      </ul>

      <h3 style={h}>3. Respaldos</h3>
      <p style={p}>Los respaldos automáticos son un apoyo y no una garantía de recuperación. Eres responsable de descargar y conservar tus propias copias periódicas desde Ajustes, así como de los documentos originales de tus clientes y pólizas.</p>

      <h3 style={h}>4. Responsabilidad sobre la información que capturas</h3>
      <p style={p}>Eres el único responsable de la veracidad, licitud y actualización de los datos y archivos que registras, de contar con el consentimiento y el aviso de privacidad correspondientes frente a tus clientes, y de cumplir con la regulación aplicable a tu actividad como agente (incluidas las obligaciones frente a aseguradoras, autoridades y tus clientes). Los datos de tus clientes son tu responsabilidad; J L CRM solo los almacena por cuenta tuya. Quedas obligado a mantener indemne a J L Consultoría Patrimonial frente a reclamaciones de terceros derivadas de tu uso indebido de la plataforma o de datos capturados sin autorización.</p>

      <h3 style={h}>5. Cálculos, comparativos y herramientas</h3>
      <p style={p}>Los cálculos, simuladores, calculadoras (comisiones, factura, deducible y coaseguro, entre otras), comparativos de cotizaciones, lectura automática de PDF, diagnósticos y propuestas son <b>orientativos</b>. Pueden contener errores, estar desactualizados o no reflejar condiciones vigentes. No constituyen asesoría legal, fiscal, contable ni financiera, ni una oferta o cotización oficial. Antes de entregar o usar cualquier resultado, verifícalo contra la documentación oficial de la aseguradora, la póliza y sus condiciones generales; prevalecen siempre los documentos oficiales.</p>

      <h3 style={h}>6. Aseguradoras, marcas y enlaces de terceros</h3>
      <p style={p}>J L CRM no es una aseguradora ni representa, avala o está afiliado oficialmente a las aseguradoras, brokers u otras empresas cuyos nombres, logos o enlaces se muestran con fines de identificación y consulta. Las marcas pertenecen a sus titulares. Los portales, cotizadores y directorios externos son ajenos a J L CRM, que no controla ni responde por su contenido, disponibilidad, seguridad o resultados.</p>

      <h3 style={h}>7. Recordatorios y notificaciones</h3>
      <p style={p}>Las alertas, recordatorios, notificaciones push, mensajes y sincronización con calendarios pueden fallar, retrasarse o no llegar por causas técnicas, de conexión, de configuración del dispositivo o de terceros. No dependas únicamente de ellos para cumplir fechas de pago, renovación, vencimiento o atención de clientes. Las comisiones, metas y pólizas mostradas son referencias de gestión y no sustituyen los estados de cuenta oficiales.</p>

      <h3 style={h}>8. Limitación de responsabilidad</h3>
      <p style={p}>En la medida permitida por la ley, J L Consultoría Patrimonial y su titular no responderán por daños indirectos, incidentales o consecuentes, ni por lucro cesante, pérdida de ventas, comisiones, clientes, oportunidades o reputación, sanciones o reclamaciones de terceros, derivados del uso o de la imposibilidad de usar la plataforma o de la información contenida en ella.</p>

      <h3 style={h}>9. Incidentes de seguridad</h3>
      <p style={p}>Si detectas o sospechas un acceso indebido, pérdida o filtración de información, avísalo de inmediato a tu administrador y cambia tu contraseña. Si J L CRM confirma una vulneración que afecte tus datos, te informará sin demora injustificada para que puedas tomar las medidas y avisos que la ley te exija frente a tus clientes.</p>

      <h3 style={h}>10. Suspensión y uso indebido</h3>
      <p style={p}>El acceso puede suspenderse o darse de baja, sin responsabilidad para J L CRM, ante uso indebido, captura de información ilícita, intento de vulnerar la seguridad, compartir cuentas o incumplimiento de estos avisos.</p>

      <h3 style={h}>11. Ley aplicable y jurisdicción</h3>
      <p style={p}>Este aviso se rige por las leyes de los Estados Unidos Mexicanos. Para su interpretación y cumplimiento, las partes se someten a los tribunales competentes de la ciudad de Puebla, Puebla, renunciando a cualquier otro fuero que pudiera corresponderles.</p>

      <p style={{ ...p, marginTop: 12, fontSize: 12.5, opacity: 0.8 }}>Versión: {VERSION_AVISO}. Si este aviso cambia, se te pedirá aceptarlo de nuevo.</p>
    </div>
  );
}

// Aviso adicional de deslinde para clientes del portal.
export function AvisoDeslindeClientes() {
  return (
    <div>
      <h3 style={{ ...h, marginTop: 20 }}>Aviso legal</h3>
      <ul style={ul}>
        <li>La información mostrada en este portal (pólizas, vigencias, pagos, recordatorios) es de <b>referencia</b> y la captura tu agente. No sustituye la póliza, los recibos ni los estados de cuenta oficiales de la aseguradora, que prevalecen en caso de diferencia.</li>
        <li>Este portal no es una aseguradora ni constituye una oferta, cotización, aceptación de riesgo ni confirmación de cobertura. Para reportar un siniestro o aclarar una cobertura, comunícate directamente con tu aseguradora o con tu agente.</li>
        <li>Los recordatorios y notificaciones pueden retrasarse o no llegar; no dependas únicamente de ellos para tus fechas de pago o renovación.</li>
        <li>Cuida tu contraseña y tu dispositivo; no la compartas ni la dejes en equipos ajenos. No nos hacemos responsables por accesos derivados de tu descuido, de dispositivos perdidos o de fallas o ataques de terceros ajenos a la plataforma, salvo en los casos en que la ley no permita excluir la responsabilidad.</li>
        <li>Los enlaces a sitios de aseguradoras y otros terceros son ajenos a esta plataforma, que no responde por su contenido ni disponibilidad.</li>
        <li>Al usar el portal aceptas este aviso. Se rige por las leyes de México y los tribunales de Puebla, Puebla.</li>
      </ul>
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
          {tipo === "clientes" ? (<><AvisoClientes /><AvisoDeslindeClientes /></>) : (<><AvisoAgentes /><AvisoDeslinde /></>)}
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
          <AvisoDeslinde />
        </div>
        <div style={{ padding: "12px 20px 18px", borderTop: "1px solid var(--line)" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)", marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
            <span>He leído el aviso de privacidad y el aviso legal de deslinde y limitación de responsabilidad, y acepto ambos. Me comprometo a contar con el consentimiento de mis clientes para capturar sus datos y a conservar mis propios respaldos.</span>
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
