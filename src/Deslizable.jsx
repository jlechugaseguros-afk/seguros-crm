import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { animarResorte, prefiereMovimientoReducido, proyectar, resistencia, velocidadDe } from "./movimiento.js";
import "./Deslizable.css";

const ANCHO_ACCION = 84;

// Tarjeta que se desliza hacia la izquierda para mostrar acciones rápidas
// (Avanzar / Perdido). Sigue al dedo 1:1, lanza con inercia y es interrumpible.
export default function Deslizable({ children, onAvanzar, onPerdido, etiquetaAvanzar = "Avanzar" }) {
  const acciones = [];
  if (onAvanzar) acciones.push("avanzar");
  if (onPerdido) acciones.push("perdido");
  const ancho = acciones.length * ANCHO_ACCION;

  const frenteRef = useRef(null);
  const xRef = useRef(0);
  const cancelar = useRef(null);
  const gesto = useRef(null);
  const huboArrastre = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => () => { if (cancelar.current) cancelar.current(); }, []);

  function aplicar(x) {
    xRef.current = x;
    if (frenteRef.current) frenteRef.current.style.transform = x === 0 ? "none" : `translate3d(${x}px, 0, 0)`;
  }

  function ir(hasta, velocidad = 0) {
    if (cancelar.current) cancelar.current();
    if (prefiereMovimientoReducido()) {
      aplicar(hasta);
      if (hasta === 0) setVisible(false);
      return;
    }
    cancelar.current = animarResorte({
      desde: xRef.current, hasta, velocidad, respuesta: 0.35, amortiguamiento: 0.85,
      onFrame: aplicar,
      onFin: () => { if (hasta === 0) setVisible(false); },
    });
  }

  if (ancho === 0) return <>{children}</>;

  function alPresionar(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (cancelar.current) cancelar.current();
    huboArrastre.current = false;
    gesto.current = { x0: e.clientX, y0: e.clientY, base: xRef.current, activo: false, muestras: [{ t: performance.now(), p: e.clientX }], id: e.pointerId };
  }

  function alMover(e) {
    const g = gesto.current;
    if (!g) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (!g.activo) {
      // Histéresis: esperar ~10 px para decidir si es horizontal o vertical
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) { gesto.current = null; return; }
      g.activo = true;
      huboArrastre.current = true;
      setVisible(true);
      try { e.currentTarget.setPointerCapture(g.id); } catch { /* sin captura */ }
    }
    let x = g.base + dx;
    if (x > 0) x = resistencia(x, 160);
    else if (x < -ancho) x = -ancho + resistencia(x + ancho, 160);
    aplicar(x);
    g.muestras.push({ t: performance.now(), p: e.clientX });
    if (g.muestras.length > 6) g.muestras.shift();
  }

  function alSoltar() {
    const g = gesto.current;
    gesto.current = null;
    if (!g || !g.activo) return;
    const v = velocidadDe(g.muestras);
    const destino = xRef.current + proyectar(v);
    ir(destino < -ancho / 2 ? -ancho : 0, v);
  }

  function alClicCapturado(e) {
    // Si hubo arrastre, o la tarjeta está abierta, el toque solo la cierra.
    if (huboArrastre.current || xRef.current !== 0) {
      e.preventDefault();
      e.stopPropagation();
      huboArrastre.current = false;
      if (xRef.current !== 0) ir(0);
    }
  }

  function ejecutar(accion) {
    ir(0);
    if (accion === "avanzar") onAvanzar();
    else onPerdido();
  }

  return (
    <div className="desliza">
      <div className="desliza-acciones" style={{ width: ancho, visibility: visible ? "visible" : "hidden" }}>
        {onAvanzar && (
          <button type="button" className="desliza-btn desliza-avanzar" tabIndex={visible ? 0 : -1} onClick={() => ejecutar("avanzar")}>
            <ArrowRight size={18} />
            {etiquetaAvanzar}
          </button>
        )}
        {onPerdido && (
          <button type="button" className="desliza-btn desliza-perdido" tabIndex={visible ? 0 : -1} onClick={() => ejecutar("perdido")}>
            <X size={18} />
            Perdido
          </button>
        )}
      </div>
      <div
        className={`desliza-frente${visible ? " en-uso" : ""}`}
        ref={frenteRef}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onClickCapture={alClicCapturado}
      >
        {children}
      </div>
    </div>
  );
}
