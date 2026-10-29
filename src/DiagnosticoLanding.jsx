import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, Download, Share2, ExternalLink, X, MessageCircle, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { JL_LOGO } from "./brandAssets.js";
import { PREGUNTAS, calcular, resumenParaCrm } from "./diagLanding/motor.js";
import { Encabezado, SeccionAreas, SeccionColchon, SeccionBrechas, HojasPdf } from "./diagLanding/Resultado.jsx";
import { wa, WHATSAPP_VISIBLE } from "./diagLanding/contacto.js";
import { registrarEvento, idVisitante, fuenteActual } from "./landingTrack.js";
import "./DiagnosticoLanding.css";

const slug = (s) => String(s || "cliente").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cliente";
const soloDigitos = (t) => String(t || "").replace(/\D/g, "");

export default function DiagnosticoLanding() {
  const [paso, setPaso] = useState(-1); // -1 intro · 0..n-1 preguntas · n contacto · n+1 resultado
  const [resp, setResp] = useState({});
  const [form, setForm] = useState({ nombre: "", tel: "", correo: "", acepta: false });
  const [estado, setEstado] = useState("idle"); // idle | enviando | falta | tel | correo | acepta
  const [aviso, setAviso] = useState("");
  const [pdf, setPdf] = useState(null); // { url, blob, nombre, error } | "generando"
  const timer = useRef(null);
  const N = PREGUNTAS.length;
  const res = useMemo(() => (paso > N ? calcular(resp) : null), [paso, resp, N]);

  useEffect(() => {
    document.title = "Diagnóstico Patrimonial · J L Consultoría Patrimonial";
    registrarEvento("visita", "diagnostico");
    // Si viene del portal de clientes, ya trae sus datos de contacto para no volver a escribirlos.
    try {
      const raw = localStorage.getItem("jl_diag_prefill");
      if (raw) {
        const d = JSON.parse(raw);
        localStorage.removeItem("jl_diag_prefill");
        if (d && Date.now() - (d.t || 0) < 6 * 3600 * 1000) setForm((f) => ({ ...f, nombre: d.nombre || f.nombre, tel: d.tel || f.tel, correo: d.correo || f.correo }));
      }
    } catch { /* sin datos previos */ }
    return () => clearTimeout(timer.current);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [paso]);

  function comenzar() { registrarEvento("diag_inicio", "diagnostico"); setPaso(0); }
  function elegir(id, valor) {
    setResp((r) => ({ ...r, [id]: valor }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPaso((p) => p + 1), 240);
  }

  async function enviar(e) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    const tel = soloDigitos(form.tel);
    const correo = form.correo.trim();
    if (nombre.length < 2) { setEstado("falta"); return; }
    if (tel.length < 10) { setEstado("tel"); return; }
    if (correo && !/^\S+@\S+\.\S+$/.test(correo)) { setEstado("correo"); return; }
    if (!form.acepta) { setEstado("acepta"); return; }
    setEstado("enviando");
    const r = calcular(resp);
    const fuente = fuenteActual();
    const telefono = tel.length === 10 ? tel : tel.slice(-10);
    const { error } = await supabase.rpc("registrar_diagnostico", {
      p_nombre: nombre, p_telefono: telefono, p_correo: correo || null, p_puntaje: r.total, p_nivel: r.nivel,
      p_respuestas: resp,
      p_resultado: { areas: r.areas.map((a) => ({ id: a.id, puntaje: a.puntaje })), brechas: r.brechas.map((b) => b.id), meses: r.meses },
      p_visitante: idVisitante(), p_fuente: fuente,
    });
    if (error) {
      // Respaldo: que el contacto nunca se pierda aunque falle el registro del diagnóstico.
      await supabase.from("solicitudes_web").insert({
        nombre, telefono, correo: correo || null, interes: "Diagnóstico patrimonial",
        mensaje: resumenParaCrm(resp, r, fuente).slice(0, 1000),
      });
    }
    setEstado("idle");
    setPaso(N + 1);
  }

  async function hacerPdf() {
    setPdf("generando");
    try {
      const [{ renderToStaticMarkup }, { generarPdf }] = await Promise.all([import("react-dom/server"), import("./diagPat/pdf.js")]);
      const html = renderToStaticMarkup(<HojasPdf res={res} nombre={form.nombre} />);
      const blob = await generarPdf(html, { alProgreso: (i, n) => setAviso(`Generando PDF… ${i}/${n}`) });
      setAviso("");
      setPdf({ blob, url: URL.createObjectURL(blob), nombre: `Diagnostico-patrimonial-${slug(form.nombre)}.pdf` });
    } catch (err) {
      setAviso("");
      setPdf({ error: String(err?.message || err) });
    }
  }
  const cerrarPdf = () => { if (pdf?.url) URL.revokeObjectURL(pdf.url); setPdf(null); };
  async function compartir() {
    try {
      const f = new File([pdf.blob], pdf.nombre, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: pdf.nombre });
    } catch { /* canceló */ }
  }
  const puedeCompartir = typeof navigator !== "undefined" && navigator.canShare && pdf?.blob && (() => { try { return navigator.canShare({ files: [new File([pdf.blob], pdf.nombre, { type: "application/pdf" })] }); } catch { return false; } })();

  const pregunta = paso >= 0 && paso < N ? PREGUNTAS[paso] : null;
  const pct = paso < 0 ? 0 : Math.min(100, Math.round((Math.min(paso, N) / (N + 1)) * 100));
  const msgWa = res ? `Hola Joshua, hice tu Diagnóstico Patrimonial y salí con ${res.total}/100 (${res.nivel}). Me gustaría revisar mis resultados contigo.` : "";

  return (
    <div className="dl">
      <header className="dl-top">
        <a href="/inicio" aria-label="Ir al inicio"><img src={JL_LOGO} alt="J L Consultoría Patrimonial" /></a>
        <a href={wa("Hola Joshua, vi tu Diagnóstico Patrimonial y tengo una duda.")} target="_blank" rel="noreferrer" className="dl-wa-mini"><MessageCircle size={15} /> WhatsApp</a>
      </header>

      {paso >= 0 && paso <= N && (
        <div className="dl-prog" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
      )}

      <main className="dl-main">
        {paso === -1 && (
          <section className="dl-intro">
            <div className="dl-eyebrow">Diagnóstico patrimonial gratuito</div>
            <h1>¿Qué tan protegidos están tu patrimonio y tu familia?</h1>
            <p className="dl-lead">Responde {N} preguntas rápidas y recibe al instante tu puntaje, un mapa de tus áreas más débiles y los primeros pasos para fortalecerlas.</p>
            <ul className="dl-pts">
              <li><Clock size={18} /> Toma menos de 3 minutos</li>
              <li><ShieldCheck size={18} /> Sin compromiso y sin cotizaciones forzadas</li>
              <li><Lock size={18} /> Tus datos solo se usan para contactarte</li>
            </ul>
            <button className="dl-btn gold grande" onClick={comenzar}>Comenzar mi diagnóstico <ArrowRight size={18} /></button>
            <p className="dl-firma"><b>Joshua Lechuga Plata</b> · Asesor en protección y planeación patrimonial</p>
          </section>
        )}

        {pregunta && (
          <section className="dl-q" key={pregunta.id}>
            <div className="dl-paso">Pregunta {paso + 1} de {N}</div>
            <h2>{pregunta.t}</h2>
            <p className="dl-s">{pregunta.s}</p>
            <div className="dl-ops">
              {pregunta.op.map(([v, l]) => {
                const on = resp[pregunta.id] === v;
                return (
                  <button key={v} className={`dl-op${on ? " on" : ""}`} onClick={() => elegir(pregunta.id, v)} aria-pressed={on}>
                    <span>{l}</span>{on && <Check size={18} />}
                  </button>
                );
              })}
            </div>
            <button className="dl-atras" onClick={() => setPaso((p) => Math.max(-1, p - 1))}><ArrowLeft size={16} /> Atrás</button>
          </section>
        )}

        {paso === N && (
          <section className="dl-q" key="contacto">
            <div className="dl-paso">Último paso</div>
            <h2>¿A dónde te enviamos tu resultado?</h2>
            <p className="dl-s">Tu diagnóstico ya está listo. Déjame tus datos para mostrártelo y poder platicarlo contigo si quieres.</p>
            <form onSubmit={enviar} className="dl-form" noValidate>
              <label>Nombre
                <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} autoComplete="name" maxLength={120} placeholder="Tu nombre" />
              </label>
              <label>WhatsApp (10 dígitos)
                <input type="tel" inputMode="tel" value={form.tel} onChange={(e) => setForm((f) => ({ ...f, tel: e.target.value }))} autoComplete="tel" maxLength={20} placeholder="Ej. 222 123 4567" />
              </label>
              <label>Correo <small>(opcional)</small>
                <input type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} autoComplete="email" maxLength={160} placeholder="tucorreo@ejemplo.com" />
              </label>
              <label className="dl-chk">
                <input type="checkbox" checked={form.acepta} onChange={(e) => setForm((f) => ({ ...f, acepta: e.target.checked }))} />
                <span>Acepto que J L Consultoría Patrimonial use mis datos para contactarme sobre mi diagnóstico y mi asesoría. No los comparto con terceros ajenos al servicio y puedo pedir que los elimine en cualquier momento.</span>
              </label>
              {estado === "falta" && <p className="dl-err">Escribe tu nombre.</p>}
              {estado === "tel" && <p className="dl-err">Escribe un WhatsApp de 10 dígitos para poder contactarte.</p>}
              {estado === "correo" && <p className="dl-err">Revisa tu correo, parece incompleto.</p>}
              {estado === "acepta" && <p className="dl-err">Marca la casilla para continuar.</p>}
              <button type="submit" className="dl-btn gold grande" disabled={estado === "enviando"}>{estado === "enviando" ? "Calculando…" : "Ver mi diagnóstico"} {estado !== "enviando" && <ArrowRight size={18} />}</button>
            </form>
            <button className="dl-atras" onClick={() => setPaso(N - 1)}><ArrowLeft size={16} /> Atrás</button>
          </section>
        )}

        {paso === N + 1 && res && (
          <section className="dl-res">
            <Encabezado res={res} nombre={form.nombre} />
            <SeccionAreas res={res} />
            <SeccionColchon res={res} />
            <SeccionBrechas res={res} />
            <div className="dl-cta">
              <div className="serif">Platiquemos tu plan, sin compromiso</div>
              <p>Con tus resultados diseño contigo un plan a tu medida y comparo opciones de varias aseguradoras. <b>Si algo no te conviene, no te lo vendo.</b></p>
              <a className="dl-btn gold grande" href={wa(msgWa)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Revisar mis resultados por WhatsApp</a>
              <button className="dl-btn claro" onClick={hacerPdf} disabled={pdf === "generando"}><Download size={16} /> {pdf === "generando" ? (aviso || "Generando PDF…") : "Descargar mi diagnóstico (PDF)"}</button>
              <small>WhatsApp {WHATSAPP_VISIBLE}</small>
            </div>
            <p className="dl-legal">Este diagnóstico es una orientación general basada en tus respuestas. No es una cotización ni una oferta de seguro; las coberturas, primas y condiciones dependen de cada aseguradora y de tu perfil.</p>
          </section>
        )}
      </main>

      {pdf && pdf !== "generando" && (
        <div className="dl-modal" role="dialog" aria-modal="true" onClick={cerrarPdf}>
          <div className="dl-card" onClick={(e) => e.stopPropagation()}>
            {pdf.error ? (<><h3>No se pudo generar el PDF</h3><p>{pdf.error}</p></>) : (<><h3>Tu PDF está listo</h3><p>{pdf.nombre}</p>
              <div className="fila">
                {puedeCompartir && <button className="dl-btn gold" onClick={compartir}><Share2 size={16} /> Compartir o guardar</button>}
                <a className={`dl-btn ${puedeCompartir ? "claro" : "gold"}`} href={pdf.url} download={pdf.nombre}><Download size={16} /> Descargar</a>
                <a className="dl-btn claro" href={pdf.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Abrir</a>
              </div></>)}
            <button className="dl-btn claro" onClick={cerrarPdf}><X size={16} /> Cerrar</button>
          </div>
        </div>
      )}

      <footer className="dl-foot">© 2026 J L Consultoría Patrimonial · <a href="/inicio">Conoce más servicios</a></footer>
    </div>
  );
}
