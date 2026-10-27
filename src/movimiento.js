// Utilidades de movimiento tipo Apple: resortes que parten de la velocidad actual,
// proyección de inercia y resistencia progresiva en los bordes.

export function prefiereMovimientoReducido() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Resorte con "respuesta" (segundos) y "amortiguamiento" (1 = sin rebote), como en iOS.
// Devuelve una función para cancelarlo; así la animación siempre se puede interrumpir.
export function animarResorte({ desde, hasta, velocidad = 0, respuesta = 0.35, amortiguamiento = 1, onFrame, onFin }) {
  const omega = (2 * Math.PI) / respuesta;
  const k = omega * omega;
  const c = 2 * amortiguamiento * omega;
  let x = desde;
  let v = velocidad;
  let t0 = null;
  let raf = 0;
  let vivo = true;
  function paso(t) {
    if (!vivo) return;
    if (t0 === null) t0 = t;
    const dt = Math.min((t - t0) / 1000, 1 / 30);
    t0 = t;
    v += (-k * (x - hasta) - c * v) * dt;
    x += v * dt;
    if (Math.abs(x - hasta) < 0.4 && Math.abs(v) < 8) {
      onFrame(hasta);
      if (onFin) onFin();
      return;
    }
    onFrame(x);
    raf = requestAnimationFrame(paso);
  }
  raf = requestAnimationFrame(paso);
  return () => {
    vivo = false;
    cancelAnimationFrame(raf);
  };
}

// Hacia dónde terminaría el movimiento si siguiera con inercia (px/s -> px).
export function proyectar(velocidad, tasa = 0.99) {
  return ((velocidad / 1000) * tasa) / (1 - tasa);
}

// Resistencia progresiva: cuanto más se pasa del borde, menos sigue el dedo.
export function resistencia(exceso, dimension = 300, constante = 0.55) {
  return (exceso * dimension * constante) / (dimension + constante * Math.abs(exceso));
}

// Velocidad (px/s) a partir de las últimas muestras {t, p}.
export function velocidadDe(muestras) {
  if (muestras.length < 2) return 0;
  const a = muestras[0];
  const b = muestras[muestras.length - 1];
  const dt = (b.t - a.t) / 1000;
  return dt > 0 ? (b.p - a.p) / dt : 0;
}
