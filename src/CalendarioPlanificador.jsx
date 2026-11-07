import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { SEMAFORO, colorDeActividad, COLOR_RECORDATORIO, ocurreEn, ESTATUS_CERRADOS } from "./actividades.js";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Calendario mensual tipo Google Calendar: cada día muestra sus actividades con color de semáforo
// y permite agregar una nueva. `remindersDe(fecha)` devuelve pagos, renovaciones y cumpleaños de ese día.
export default function CalendarioPlanificador({ clients, prospectos, activities, remindersDe, onNuevo, onEditar }) {
  const hoy = new Date();
  const hoyStr = iso(hoy);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [sel, setSel] = useState(hoyStr);

  const celdas = useMemo(() => {
    const primero = new Date(anio, mes, 1);
    const inicio = new Date(anio, mes, 1 - ((primero.getDay() + 6) % 7));
    const filas = Math.ceil(((primero.getDay() + 6) % 7 + new Date(anio, mes + 1, 0).getDate()) / 7);
    return Array.from({ length: filas * 7 }, (_, i) => {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      return { fecha: iso(d), dia: d.getDate(), fuera: d.getMonth() !== mes };
    });
  }, [anio, mes]);

  const items = useMemo(() => {
    const porDia = {};
    celdas.forEach(({ fecha }) => {
      const lista = [];
      (activities || []).forEach((a) => {
        if (!ocurreEn(a, fecha)) return;
        const cli = a.clienteId ? (clients || []).find((c) => c.id === a.clienteId) : null;
        const pro = a.prospectoId ? (prospectos || []).find((p) => p.id === a.prospectoId) : null;
        const quien = cli ? cli.nombre : pro ? pro.nombre : a.prospectoNombre || "";
        lista.push({
          key: `a-${a.id}`, act: a, color: colorDeActividad(a), hora: a.hora || "", horaFin: a.horaFin || "",
          texto: a.descripcion || a.tipo, sub: `${a.tipo}${quien ? ` · ${quien}${pro || a.prospectoId ? " (prospecto)" : ""}` : ""}`,
          cerrado: ESTATUS_CERRADOS.includes(a.estatus), estatus: a.estatus || "Pendiente",
        });
      });
      (remindersDe ? remindersDe(fecha) : []).forEach((r, j) => {
        lista.push({
          key: `r-${fecha}-${j}`, act: null, color: COLOR_RECORDATORIO[r.tone] || "rojo", hora: "", horaFin: "",
          texto: `${r.client.nombre}`, sub: r.label, cerrado: false,
        });
      });
      lista.sort((x, y) => (x.hora || "").localeCompare(y.hora || ""));
      porDia[fecha] = lista;
    });
    return porDia;
  }, [celdas, activities, clients, prospectos, remindersDe]);

  function mover(delta) {
    let m = mes + delta; let y = anio;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMes(m); setAnio(y);
  }
  function irHoy() { setAnio(hoy.getFullYear()); setMes(hoy.getMonth()); setSel(hoyStr); }

  const delSel = items[sel] || [];
  const [sy, sm, sd] = sel.split("-").map(Number);
  const tituloSel = `${sd} de ${MESES[sm - 1].toLowerCase()} de ${sy}`;

  return (
    <div className="pl-cal">
      <div className="pl-cal-bar">
        <div className="pl-nav">
          <button type="button" onClick={() => mover(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
          <h3 className="serif">{MESES[mes]} {anio}</h3>
          <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
        </div>
        <button type="button" className="pl-hoy" onClick={irHoy}>Hoy</button>
      </div>

      <div className="pl-leyenda" aria-label="Significado de los colores">
        {Object.entries(SEMAFORO).map(([k, v]) => (
          <span key={k}><i style={{ background: v.color }} />{k === "verde" ? "Venta" : k === "amarillo" ? "Te acerca a vender / impacta tu meta" : "Administrativa"}</span>
        ))}
      </div>

      <div className="pl-grid" role="grid" aria-label={`Calendario de ${MESES[mes]} ${anio}`}>
        {DIAS.map((d) => <div key={d} className="pl-dow" role="columnheader">{d}</div>)}
        {celdas.map(({ fecha, dia, fuera }) => {
          const lista = items[fecha] || [];
          const esHoy = fecha === hoyStr;
          return (
            <div
              key={fecha}
              role="gridcell"
              tabIndex={0}
              aria-selected={fecha === sel}
              className={"pl-cell" + (fuera ? " fuera" : "") + (esHoy ? " hoy" : "") + (fecha === sel ? " sel" : "")}
              onClick={() => setSel(fecha)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(fecha); } }}
            >
              <div className="pl-top">
                <span className="pl-num">{dia}</span>
                <button type="button" className="pl-add" aria-label={`Agregar actividad el ${dia}`}
                  onClick={(e) => { e.stopPropagation(); setSel(fecha); onNuevo(fecha); }}>
                  <Plus size={14} />
                </button>
              </div>
              <div className="pl-chips">
                {lista.slice(0, 3).map((it) => (
                  it.act ? (
                    <button key={it.key} type="button" className={"pl-chip" + (it.cerrado ? " cerrado" : "")}
                      style={{ background: SEMAFORO[it.color].soft, borderLeftColor: SEMAFORO[it.color].color }}
                      onClick={(e) => { e.stopPropagation(); onEditar(it.act); }} title={`${it.sub} · ${it.estatus}`}>
                      {it.hora && <b>{it.hora}</b>} {it.texto}
                    </button>
                  ) : (
                    <span key={it.key} className="pl-chip rec" style={{ background: SEMAFORO[it.color].soft, borderLeftColor: SEMAFORO[it.color].color }} title={`${it.texto} · ${it.sub}`}>
                      {it.texto} · {it.sub}
                    </span>
                  )
                ))}
                {lista.length > 3 && <span className="pl-more">+{lista.length - 3} más</span>}
              </div>
              {lista.length > 0 && (
                <div className="pl-dots" aria-hidden="true">
                  {lista.slice(0, 6).map((it) => <i key={it.key} style={{ background: SEMAFORO[it.color].color }} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pl-dia">
        <div className="pl-dia-head">
          <h4 className="serif">{tituloSel}</h4>
          <button type="button" onClick={() => onNuevo(sel)}><Plus size={15} /> Agregar actividad</button>
        </div>
        {delSel.length === 0 ? (
          <p className="pl-vacio">Sin actividades este día.</p>
        ) : delSel.map((it) => {
          const inner = (
            <>
              <i style={{ background: SEMAFORO[it.color].color }} />
              <span className="pl-fila-txt">
                <b className={it.cerrado ? "cerrado" : ""}>{it.hora ? `${it.hora}${it.horaFin ? `–${it.horaFin}` : ""} · ` : ""}{it.texto}</b>
                <small>{it.sub}{it.act ? ` · ${it.estatus}` : ""}</small>
              </span>
            </>
          );
          return it.act ? (
            <button key={it.key} type="button" className="pl-fila" onClick={() => onEditar(it.act)}>{inner}</button>
          ) : (
            <div key={it.key} className="pl-fila est">{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
