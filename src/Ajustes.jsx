import React, { useEffect, useState } from "react";
import { X, User, Palette, Bell, ShieldCheck, CalendarDays, LogOut, RotateCcw } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { gcalDisponible, gcalActivo, gcalConectar, gcalDesactivar } from "./googleCalendar.js";
import { TEMAS, AJUSTES_BASE, leerAjustes, guardarAjustes, aplicarAjustes } from "./ajustesAparencia.js";
import "./Ajustes.css";

function Seccion({ icono, titulo, children }) {
  return (
    <section className="aj-sec">
      <h3>{icono}{titulo}</h3>
      {children}
    </section>
  );
}

function Fila({ etiqueta, valor, children }) {
  return (
    <label className="aj-fila">
      <span className="aj-et">{etiqueta}{valor != null && <em>{valor}</em>}</span>
      {children}
    </label>
  );
}

function Interruptor({ activo, onChange, etiqueta, ayuda }) {
  return (
    <div className="aj-fila aj-fila-sw">
      <span className="aj-et">{etiqueta}{ayuda && <small>{ayuda}</small>}</span>
      <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} className={"aj-sw" + (activo ? " on" : "")} onClick={() => onChange(!activo)}><i /></button>
    </div>
  );
}

export default function Ajustes({ profile, onSaveProfile, onClose, notifEstado, notifError, onActivarNotif, onDesactivarNotif }) {
  const [aj, setAj] = useState(leerAjustes());
  const [nombre, setNombre] = useState(profile?.nombre || "");
  const [correo, setCorreo] = useState(profile?.correo || "");
  const [perfilMsg, setPerfilMsg] = useState("");
  const [emailAcceso, setEmailAcceso] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [cuentaMsg, setCuentaMsg] = useState({ t: "", ok: true });
  const [gcalOn, setGcalOn] = useState(gcalActivo());
  const [gcalErr, setGcalErr] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmailAcceso(data?.user?.email || ""));
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const cambiar = (patch) => {
    const n = { ...aj, ...patch };
    setAj(n); guardarAjustes(n); aplicarAjustes(n);
  };

  function guardarPerfil(e) {
    e.preventDefault();
    if (!nombre.trim() || !correo.trim()) { setPerfilMsg("Nombre y correo son obligatorios."); return; }
    onSaveProfile({ nombre: nombre.trim(), correo: correo.trim() });
    setPerfilMsg("Perfil guardado ✓");
  }

  async function cambiarEmail(e) {
    e.preventDefault();
    if (!nuevoEmail.trim()) return;
    const { error } = await supabase.auth.updateUser({ email: nuevoEmail.trim() });
    setCuentaMsg(error ? { t: error.message, ok: false } : { t: "Te enviamos un correo de confirmación. El cambio se aplica al confirmarlo.", ok: true });
    if (!error) setNuevoEmail("");
  }

  async function cambiarPass(e) {
    e.preventDefault();
    if (pass1.length < 8) { setCuentaMsg({ t: "La contraseña debe tener al menos 8 caracteres.", ok: false }); return; }
    if (pass1 !== pass2) { setCuentaMsg({ t: "Las contraseñas no coinciden.", ok: false }); return; }
    const { error } = await supabase.auth.updateUser({ password: pass1 });
    setCuentaMsg(error ? { t: error.message, ok: false } : { t: "Contraseña actualizada ✓", ok: true });
    if (!error) { setPass1(""); setPass2(""); }
  }

  async function alternarGcal() {
    setGcalErr("");
    if (gcalOn) { gcalDesactivar(); setGcalOn(false); return; }
    try { await gcalConectar(); setGcalOn(true); } catch (e) { setGcalErr(e.message || "No se pudo conectar"); }
  }

  const restablecer = () => { setAj({ ...AJUSTES_BASE }); guardarAjustes({ ...AJUSTES_BASE }); aplicarAjustes({ ...AJUSTES_BASE }); };

  return (
    <div className="aj-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="aj-sheet" role="dialog" aria-modal="true" aria-label="Ajustes">
        <header className="aj-head">
          <h2 className="serif">Ajustes</h2>
          <button className="aj-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="aj-body">
          <Seccion icono={<User size={16} />} titulo="Perfil">
            <form onSubmit={guardarPerfil}>
              <Fila etiqueta="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} /></Fila>
              <Fila etiqueta="Correo de contacto (firma de mensajes)"><input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Fila>
              <button className="aj-btn" type="submit">Guardar perfil</button>
              {perfilMsg && <p className="aj-msg">{perfilMsg}</p>}
            </form>
          </Seccion>

          <Seccion icono={<Palette size={16} />} titulo="Apariencia">
            <p className="aj-lbl">Color del tema</p>
            <div className="aj-temas">
              {Object.entries(TEMAS).map(([id, t]) => (
                <button key={id} type="button" className={"aj-tema" + (aj.tema === id ? " on" : "")} onClick={() => cambiar({ tema: id })} aria-label={t.nombre} title={t.nombre}>
                  <span style={{ background: `linear-gradient(135deg, ${t.ink} 55%, ${t.gold} 55%)` }} />
                  <small>{t.nombre}</small>
                </button>
              ))}
            </div>
            <Fila etiqueta="Transparencia de tarjetas" valor={`${100 - aj.vidrio}%`}>
              <input type="range" min="30" max="95" value={aj.vidrio} onChange={(e) => cambiar({ vidrio: +e.target.value })} />
            </Fila>
            <Fila etiqueta="Desenfoque del cristal" valor={`${aj.desenfoque}px`}>
              <input type="range" min="0" max="40" value={aj.desenfoque} onChange={(e) => cambiar({ desenfoque: +e.target.value })} />
            </Fila>
            <Fila etiqueta="Transparencia del menú lateral" valor={`${100 - aj.menu}%`}>
              <input type="range" min="55" max="100" value={aj.menu} onChange={(e) => cambiar({ menu: +e.target.value })} />
            </Fila>
            <Interruptor activo={aj.menuFoto} onChange={(v) => cambiar({ menuFoto: v })} etiqueta="Foto de fondo en el menú" />
            <Interruptor activo={aj.fondoAnimado} onChange={(v) => cambiar({ fondoAnimado: v })} etiqueta="Fondo con movimiento" ayuda="Solo en pantallas grandes" />
            <Interruptor activo={aj.animaciones} onChange={(v) => cambiar({ animaciones: v })} etiqueta="Animaciones" ayuda="Apágalas si tu equipo va lento" />
            <p className="aj-lbl">Tamaño de texto</p>
            <div className="aj-seg">
              {[[90, "Pequeño"], [100, "Normal"], [110, "Grande"], [120, "Muy grande"]].map(([v, n]) => (
                <button key={v} type="button" className={aj.texto === v ? "on" : ""} onClick={() => cambiar({ texto: v })}>{n}</button>
              ))}
            </div>
            <button type="button" className="aj-btn aj-sec-btn" onClick={restablecer}><RotateCcw size={14} /> Restablecer apariencia</button>
          </Seccion>

          <Seccion icono={<Bell size={16} />} titulo="Notificaciones">
            {notifEstado === "no-soportado" ? (
              <p className="aj-msg">Este navegador no admite notificaciones push. En iPhone, agrega la app a la pantalla de inicio.</p>
            ) : (
              <Interruptor
                activo={notifEstado === "activo"}
                onChange={(v) => (v ? onActivarNotif() : onDesactivarNotif())}
                etiqueta="Avisos push en este dispositivo"
                ayuda="Pagos, renovaciones, cumpleaños y citas"
              />
            )}
            {notifError && <p className="aj-msg aj-err">{notifError}</p>}
            {gcalDisponible() && (
              <>
                <Interruptor activo={gcalOn} onChange={alternarGcal} etiqueta="Sincronizar con Google Calendar" ayuda="Las actividades del Planificador se crean solas" />
                {gcalErr && <p className="aj-msg aj-err">{gcalErr}</p>}
              </>
            )}
          </Seccion>

          <Seccion icono={<ShieldCheck size={16} />} titulo="Cuenta y seguridad">
            <p className="aj-lbl">Correo de acceso actual: <b>{emailAcceso || "—"}</b></p>
            <form onSubmit={cambiarEmail}>
              <Fila etiqueta="Nuevo correo de acceso"><input type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} placeholder="nuevo@correo.com" /></Fila>
              <button className="aj-btn" type="submit" disabled={!nuevoEmail.trim()}>Cambiar correo</button>
            </form>
            <form onSubmit={cambiarPass} style={{ marginTop: 14 }}>
              <Fila etiqueta="Nueva contraseña"><input type="password" autoComplete="new-password" value={pass1} onChange={(e) => setPass1(e.target.value)} /></Fila>
              <Fila etiqueta="Repite la contraseña"><input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} /></Fila>
              <button className="aj-btn" type="submit" disabled={!pass1}>Cambiar contraseña</button>
            </form>
            {cuentaMsg.t && <p className={"aj-msg" + (cuentaMsg.ok ? "" : " aj-err")}>{cuentaMsg.t}</p>}
            <button type="button" className="aj-btn aj-sec-btn" style={{ marginTop: 14 }} onClick={() => supabase.auth.signOut()}><LogOut size={14} /> Cerrar sesión</button>
          </Seccion>

          <p className="aj-foot"><CalendarDays size={12} /> Las preferencias de apariencia se guardan en este dispositivo.</p>
        </div>
      </div>
    </div>
  );
}
