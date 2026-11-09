import React, { useState, useEffect, useMemo, useRef } from "react";
import { HelpCircle, X, Send, ArrowRight, Sparkles } from "lucide-react";
import { AYUDA_TEMAS, SUGERIDOS_POR_TAB, SUGERIDOS_GENERALES, buscarAyuda } from "./ayudaContenido.js";
import "./AyudaFlotante.css";

// Temas cuya "pestaña" no es una pantalla a la que se pueda navegar directo.
const SIN_NAVEGAR = new Set(["directorios"]);

// Chat de ayuda flotante guiado (sin IA, sin costo): responde con pasos escritos para cada pestaña del CRM.
export default function AyudaFlotante({ tab, setTab, puedeVer, nombre, etiquetaTab }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const finRef = useRef(null);
  const inputRef = useRef(null);

  // Solo se ofrece ayuda de lo que ese usuario puede ver.
  const temas = useMemo(
    () => AYUDA_TEMAS.filter((t) => !t.tab || puedeVer(t.tab)),
    [puedeVer]
  );
  const porId = useMemo(() => Object.fromEntries(temas.map((t) => [t.id, t])), [temas]);

  const sugeridos = useMemo(() => {
    const deAqui = (SUGERIDOS_POR_TAB[tab] || []).map((id) => porId[id]).filter(Boolean);
    const generales = SUGERIDOS_GENERALES.map((id) => porId[id]).filter(Boolean);
    const vistos = new Set();
    return [...deAqui, ...generales].filter((t) => (vistos.has(t.id) ? false : vistos.add(t.id))).slice(0, 6);
  }, [tab, porId]);

  const abrir = () => {
    if (mensajes.length === 0) {
      const primer = (nombre || "").trim().split(/\s+/)[0];
      setMensajes([{ rol: "bot", texto: `${primer ? `Hola, ${primer}.` : "Hola."} Soy la ayuda del CRM. Escribe qué necesitas hacer o toca una sugerencia.` }]);
    }
    setAbierto(true);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 250);
  };

  useEffect(() => {
    if (finRef.current) finRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [mensajes, abierto]);

  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  const preguntar = (pregunta, temaDirecto) => {
    const q = (pregunta || "").trim();
    if (!q) return;
    const encontrados = temaDirecto ? [temaDirecto] : buscarAyuda(q, temas);
    setMensajes((m) => [
      ...m,
      { rol: "user", texto: q },
      encontrados.length
        ? { rol: "bot", texto: encontrados.length > 1 ? "Esto puede ayudarte:" : "", temas: encontrados }
        : {
            rol: "bot",
            texto: "No encontré una respuesta para eso. Prueba con una palabra clave (por ejemplo: póliza, prospecto, recordatorio, comisión, importar, factura) o toca una sugerencia.",
            sugerir: true,
          },
    ]);
    setTexto("");
  };

  const enviar = (e) => {
    e.preventDefault();
    preguntar(texto);
  };

  const ir = (t) => {
    setTab(t.tab);
    setAbierto(false);
  };

  return (
    <>
      {!abierto && (
        <button type="button" className="ayuda-fab" onClick={abrir} aria-label="Abrir ayuda">
          <HelpCircle size={24} />
          <span className="ayuda-fab-txt">Ayuda</span>
        </button>
      )}

      {abierto && (
        <section className="ayuda-panel" role="dialog" aria-label="Ayuda del CRM">
          <header className="ayuda-head">
            <div className="ayuda-head-ico"><Sparkles size={16} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>Ayuda del CRM</b>
              <small>Respuestas paso a paso</small>
            </div>
            <button type="button" className="ayuda-x" onClick={() => setAbierto(false)} aria-label="Cerrar ayuda"><X size={18} /></button>
          </header>

          <div className="ayuda-body">
            {mensajes.map((m, i) => (
              <div key={i} className={"ayuda-msg " + (m.rol === "user" ? "user" : "bot")}>
                {m.texto && <p>{m.texto}</p>}
                {m.temas && m.temas.map((t) => (
                  <article key={t.id} className="ayuda-card">
                    <h4>{t.titulo}</h4>
                    <ol>{t.pasos.map((p, k) => <li key={k}>{p}</li>)}</ol>
                    {t.tab && !SIN_NAVEGAR.has(t.tab) && t.tab !== tab && (
                      <button type="button" className="ayuda-ir" onClick={() => ir(t)}>
                        Ir a {etiquetaTab(t.tab)} <ArrowRight size={14} />
                      </button>
                    )}
                  </article>
                ))}
                {m.sugerir && (
                  <div className="ayuda-chips">
                    {sugeridos.map((t) => (
                      <button type="button" key={t.id} onClick={() => preguntar(t.titulo, t)}>{t.titulo}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {mensajes.length <= 1 && (
              <div className="ayuda-chips">
                {sugeridos.map((t) => (
                  <button type="button" key={t.id} onClick={() => preguntar(t.titulo, t)}>{t.titulo}</button>
                ))}
              </div>
            )}
            <div ref={finRef} />
          </div>

          <form className="ayuda-form" onSubmit={enviar}>
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="¿Qué quieres hacer? Ej: agregar póliza"
              aria-label="Escribe tu pregunta"
              enterKeyHint="send"
            />
            <button type="submit" aria-label="Enviar" disabled={!texto.trim()}><Send size={18} /></button>
          </form>
        </section>
      )}
    </>
  );
}
