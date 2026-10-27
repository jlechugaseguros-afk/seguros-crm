import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { animarResorte, prefiereMovimientoReducido, proyectar, resistencia, velocidadDe } from "./movimiento.js";
import "./Hoja.css";

// Hoja inferior: sube desde abajo, se puede arrastrar para cerrar (con inercia) y
// se cierra por la misma ruta por la que entró. Siempre es interrumpible.
export default function Hoja({ titulo, subtitulo, onCerrar, children }) {
  const hojaRef = useRef(null);
  const fondoRef = useRef(null);
  const yRef = useRef(0);
  const cancelarAnim = useRef(null);
  const arrastre = useRef(null);
  const cerrando = useRef(false);
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => { onCerrarRef.current = onCerrar; }, [onCerrar]);

  const aplicar = useCallback((y) => {
    yRef.current = y;
    const hoja = hojaRef.current;
    if (!hoja) return;
    hoja.style.transform = `translate3d(0, ${y}px, 0)`;
    const alto = hoja.offsetHeight || 1;
    if (fondoRef.current) fondoRef.current.style.opacity = String(Math.min(1, Math.max(0, 1 - y / alto)));
  }, []);

  // Al terminar, se quita el transform para que los formularios internos (position: fixed) no queden atrapados.
  const reposar = useCallback(() => {
    const hoja = hojaRef.current;
    if (hoja) hoja.style.transform = "none";
    if (fondoRef.current) fondoRef.current.style.opacity = "1";
    yRef.current = 0;
  }, []);

  const cerrar = useCallback((velocidad = 0) => {
    if (cerrando.current) return;
    cerrando.current = true;
    const hoja = hojaRef.current;
    if (!hoja || prefiereMovimientoReducido()) { onCerrarRef.current(); return; }
    if (cancelarAnim.current) cancelarAnim.current();
    cancelarAnim.current = animarResorte({
      desde: yRef.current, hasta: hoja.offsetHeight + 40, velocidad,
      respuesta: 0.32, amortiguamiento: 1,
      onFrame: aplicar, onFin: () => onCerrarRef.current(),
    });
  }, [aplicar]);

  // Entrada: parte desde abajo con un resorte sin rebote.
  useLayoutEffect(() => {
    const hoja = hojaRef.current;
    if (!hoja) return undefined;
    if (prefiereMovimientoReducido()) { reposar(); return undefined; }
    aplicar(hoja.offsetHeight + 40);
    cancelarAnim.current = animarResorte({
      desde: hoja.offsetHeight + 40, hasta: 0, respuesta: 0.4, amortiguamiento: 1,
      onFrame: aplicar, onFin: reposar,
    });
    return () => { if (cancelarAnim.current) cancelarAnim.current(); };
  }, [aplicar, reposar]);

  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function alTeclear(e) { if (e.key === "Escape") cerrar(); }
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [cerrar]);

  function alPresionar(e) {
    if (e.target.closest("button, a, input, select, textarea")) return;
    if (cancelarAnim.current) cancelarAnim.current();
    const hoja = hojaRef.current;
    if (hoja && yRef.current === 0) hoja.style.transform = "translate3d(0, 0, 0)";
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { inicio: e.clientY - yRef.current, muestras: [{ t: performance.now(), p: e.clientY }] };
  }

  function alMover(e) {
    const a = arrastre.current;
    if (!a) return;
    const dy = e.clientY - a.inicio;
    aplicar(dy >= 0 ? dy : resistencia(dy, 160));
    a.muestras.push({ t: performance.now(), p: e.clientY });
    if (a.muestras.length > 6) a.muestras.shift();
  }

  function alSoltar() {
    const a = arrastre.current;
    arrastre.current = null;
    const hoja = hojaRef.current;
    if (!a || !hoja) return;
    const velocidad = velocidadDe(a.muestras);
    const destino = yRef.current + proyectar(velocidad);
    if (destino > hoja.offsetHeight * 0.45) { cerrar(velocidad); return; }
    cancelarAnim.current = animarResorte({
      desde: yRef.current, hasta: 0, velocidad, respuesta: 0.35, amortiguamiento: 0.85,
      onFrame: aplicar, onFin: reposar,
    });
  }

  return createPortal(
    <div
      className="hoja-fondo"
      ref={fondoRef}
      onPointerDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}
    >
      <section className="hoja" ref={hojaRef} role="dialog" aria-modal="true" aria-label={titulo}>
        <div
          className="hoja-asa"
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
        >
          <span className="hoja-grabber" aria-hidden="true" />
          <div className="hoja-cab">
            <div className="hoja-titulos">
              <h2 className="serif">{titulo}</h2>
              {subtitulo && <p>{subtitulo}</p>}
            </div>
            <button type="button" className="hoja-cerrar" onClick={() => cerrar()} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="hoja-cuerpo">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
