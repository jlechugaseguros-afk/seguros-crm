import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  SEMAFORO, TIPOS_POR_COLOR, TIPO_DEFECTO, colorDeActividad, ESTATUS_ACTIVIDAD, ESTATUS_DEFECTO,
  REPETICIONES, fmtFechaHoraTs,
} from "./actividades.js";

// Ventana "Evento" del Planificador y del Dashboard (Próximos 7 días).
// Crea o edita una actividad; si está ligada a un prospecto muestra su historial de cambios con fecha y hora
// y pide un comentario obligatorio cuando hay un movimiento.
export default function EventoModal({ modo, actividad, fechaInicial, pasoInicial = "form", clients, prospectos, onGuardar, onEliminar, onCerrar }) {
  const editar = modo === "editar" && actividad;
  const [f, setF] = useState(() => ({
    descripcion: editar ? actividad.descripcion || "" : "",
    fecha: editar ? actividad.fecha : fechaInicial,
    hora: editar ? actividad.hora || "" : "",
    horaFin: editar ? actividad.horaFin || "" : "",
    tipo: editar ? actividad.tipo || TIPO_DEFECTO : TIPO_DEFECTO,
    estatus: editar ? actividad.estatus || ESTATUS_DEFECTO : ESTATUS_DEFECTO,
    repite: editar ? actividad.repite || "" : "",
    contacto: editar ? (actividad.prospectoId ? `p:${actividad.prospectoId}` : actividad.clienteId ? `c:${actividad.clienteId}` : "") : "",
  }));
  const [paso, setPaso] = useState(pasoInicial === "historial" && modo === "editar" && actividad && actividad.prospectoId ? "historial" : "form");
  const [comentario, setComentario] = useState("");
  const [err, setErr] = useState("");
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const contactoFijo = !!(editar && actividad.prospectoId);
  const prospecto = useMemo(
    () => (f.contacto.startsWith("p:") ? (prospectos || []).find((p) => p.id === f.contacto.slice(2)) || null : null),
    [f.contacto, prospectos],
  );
  const nombreProspectoFijo = contactoFijo ? (prospecto ? prospecto.nombre : actividad.prospectoNombre || "Prospecto") : "";
  const historial = useMemo(
    () => [...((prospecto && prospecto.historial) || [])].sort((a, b) => (b.ts || 0) - (a.ts || 0)),
    [prospecto],
  );

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr(""); };
  const liga = !!f.contacto.startsWith("p:");

  const hayCambios = !editar || (
    f.descripcion !== (actividad.descripcion || "") || f.fecha !== actividad.fecha
    || f.hora !== (actividad.hora || "") || f.horaFin !== (actividad.horaFin || "")
    || f.tipo !== (actividad.tipo || TIPO_DEFECTO) || f.estatus !== (actividad.estatus || ESTATUS_DEFECTO)
  );
  const pideComentario = liga && hayCambios;
  const color = SEMAFORO[colorDeActividad({ tipo: f.tipo, prospectoId: liga ? "x" : "" })];

  function guardar() {
    if (!f.descripcion.trim()) { setErr("Escribe un título para la actividad."); return; }
    if (!f.fecha) { setErr("Elige el día."); return; }
    if (f.hora && f.horaFin && f.horaFin <= f.hora) { setErr("La hora de fin debe ser después de la de inicio."); return; }
    if (pideComentario && !comentario.trim()) { setErr("El comentario es obligatorio para guardar este cambio."); return; }
    if (!hayCambios) { onCerrar(); return; }

    const base = editar ? { ...actividad } : { id: Date.now().toString() };
    const a = {
      ...base,
      descripcion: f.descripcion.trim(),
      fecha: f.fecha,
      hora: f.hora,
      horaFin: f.horaFin,
      tipo: f.tipo,
      estatus: f.estatus,
      repite: liga ? "" : f.repite,
    };
    if (f.contacto.startsWith("c:")) { a.clienteId = f.contacto.slice(2); delete a.prospectoId; delete a.prospectoNombre; delete a.prospectoTelefono; }
    else if (liga) {
      a.clienteId = "";
      a.prospectoId = f.contacto.slice(2);
      a.prospectoNombre = prospecto ? prospecto.nombre : base.prospectoNombre || "";
      a.prospectoTelefono = prospecto ? prospecto.telefono : base.prospectoTelefono || "";
    } else { a.clienteId = ""; delete a.prospectoId; delete a.prospectoNombre; delete a.prospectoTelefono; }
    onGuardar({ actividad: a, anterior: editar ? actividad : null, comentario: comentario.trim() });
  }

  if (paso === "historial") {
    const ultimo = historial[0];
    const anteriores = historial.slice(1);
    return (
      <div className="fade-in evm-back" role="dialog" aria-modal="true" aria-label="Historial del prospecto">
        <div className="dialog-in evm">
          <div className="evm-head">
            <h3 className="serif">Historial · {nombreProspectoFijo}</h3>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="evm-x"><X size={18} /></button>
          </div>
          <div className="evm-body">
            {!ultimo ? (
              <p className="evm-nota" style={{ margin: "4px 0 12px" }}>Aún no hay cambios registrados para este prospecto.</p>
            ) : (
              <>
                <div className="evm-ultimo">
                  <small>Último cambio · {fmtFechaHoraTs(ultimo.ts)}</small>
                  <strong>{ultimo.titulo}</strong>
                  {ultimo.detalle && <strong className="d">{ultimo.detalle}</strong>}
                  {ultimo.comentario && <strong className="c">“{ultimo.comentario}”</strong>}
                </div>
                {anteriores.length > 0 && <h4 className="evm-prev">Cambios anteriores</h4>}
                {anteriores.map((h) => (
                  <div key={h.id} className="evm-h-item">
                    <small>{fmtFechaHoraTs(h.ts)}</small>
                    <span className="t">{h.titulo}</span>
                    {h.detalle && <span>{h.detalle}</span>}
                    {h.comentario && <p>{h.comentario}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="evm-foot">
            <button type="button" className="evm-volver" onClick={onCerrar}>Volver</button>
            <button type="button" className="evm-guardar" onClick={() => setPaso("form")} autoFocus>Siguiente acción →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in evm-back" role="dialog" aria-modal="true" aria-label={editar ? "Editar evento" : "Crear nuevo evento"}>
      <div className="dialog-in evm">
        <div className="evm-head">
          <h3 className="serif">{editar ? "Editar evento" : "Crear nuevo evento"}</h3>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="evm-x"><X size={18} /></button>
        </div>

        <div className="evm-body">
          <div className="evm-row">
            <label htmlFor="evm-titulo">Título</label>
            <input id="evm-titulo" autoFocus={!editar} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
          </div>

          <div className="evm-row">
            <label htmlFor="evm-contacto">Contacto</label>
            {contactoFijo ? (
              <div className="evm-fijo">{nombreProspectoFijo} <small>· prospecto</small></div>
            ) : (
              <select id="evm-contacto" value={f.contacto} onChange={(e) => set("contacto", e.target.value)}>
                <option value="">Sin contacto relacionado</option>
                {(clients || []).length > 0 && (
                  <optgroup label="Clientes">
                    {clients.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.nombre}</option>)}
                  </optgroup>
                )}
                {(prospectos || []).length > 0 && (
                  <optgroup label="Prospectos">
                    {prospectos.map((p) => <option key={p.id} value={`p:${p.id}`}>{p.nombre}</option>)}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          <div className="evm-trio">
            <div><label htmlFor="evm-dia">Día</label><input id="evm-dia" type="date" value={f.fecha || ""} onChange={(e) => set("fecha", e.target.value)} /></div>
            <div><label htmlFor="evm-ini">Inicio</label><input id="evm-ini" type="time" value={f.hora} onChange={(e) => set("hora", e.target.value)} /></div>
            <div><label htmlFor="evm-fin">Fin</label><input id="evm-fin" type="time" value={f.horaFin} onChange={(e) => set("horaFin", e.target.value)} /></div>
          </div>
          <p className="evm-nota">Con hora, te avisamos 15 minutos antes (campanita y notificación). Sin hora, a las 8 AM del día.</p>

          <div className="evm-duo">
            <div>
              <label htmlFor="evm-tipo">Tipo</label>
              <select id="evm-tipo" value={f.tipo} onChange={(e) => set("tipo", e.target.value)} style={{ borderBottom: `3px solid ${color.color}` }}>
                {Object.entries(TIPOS_POR_COLOR).map(([c, tipos]) => (
                  <optgroup key={c} label={`${c === "verde" ? "🟢" : c === "amarillo" ? "🟡" : "🔴"} ${SEMAFORO[c].label}`}>
                    {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                ))}
                {!Object.values(TIPOS_POR_COLOR).flat().includes(f.tipo) && <option value={f.tipo}>{f.tipo}</option>}
              </select>
            </div>
            <div>
              <label htmlFor="evm-est">Estatus</label>
              <select id="evm-est" value={f.estatus} onChange={(e) => set("estatus", e.target.value)}>
                {ESTATUS_ACTIVIDAD.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="evm-semaforo"><i style={{ background: color.color }} /> {color.label}</div>

          {!liga && (
            <div className="evm-row evm-col">
              <label htmlFor="evm-rep">Se repite cada</label>
              <select id="evm-rep" value={f.repite} onChange={(e) => set("repite", e.target.value)}>
                {REPETICIONES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}

          {liga && (
            <div className="evm-hist">
              {pideComentario && (
                <div style={{ marginBottom: 12 }}>
                  <label htmlFor="evm-com">¿Qué pasó? (obligatorio)</label>
                  <textarea id="evm-com" rows={3} value={comentario} placeholder="Escribe lo que se habló o acordó…"
                    onChange={(e) => { setComentario(e.target.value); setErr(""); }} />
                </div>
              )}
              <h4>Historial de cambios</h4>
              {historial.length === 0 ? (
                <p className="evm-nota" style={{ margin: 0 }}>Aún no hay cambios registrados.</p>
              ) : historial.map((h) => (
                <div key={h.id} className="evm-h-item">
                  <small>{fmtFechaHoraTs(h.ts)}</small>
                  <b>{h.titulo}</b>
                  {h.detalle && <span>{h.detalle}</span>}
                  {h.comentario && <p>{h.comentario}</p>}
                </div>
              ))}
            </div>
          )}

          {err && <p role="alert" className="evm-err">{err}</p>}
        </div>

        <div className="evm-foot">
          <button type="button" className="evm-volver" onClick={onCerrar}>Volver</button>
          {editar && (
            confirmarBorrar ? (
              <button type="button" className="evm-del on" onClick={() => onEliminar(actividad.id)}>¿Eliminar? Confirmar</button>
            ) : (
              <button type="button" className="evm-del" onClick={() => setConfirmarBorrar(true)}>Eliminar</button>
            )
          )}
          <button type="button" className="evm-guardar" onClick={guardar}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
