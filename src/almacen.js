import { useEffect, useRef, useState, useCallback } from "react";

// Guarda un dato propio del agente en app_data (clave-valor) con la misma regla que el resto del CRM:
// no se escribe nada hasta haber leído lo existente, para no pisar datos reales con un estado vacío.
export function useAlmacen(clave, vacio) {
  const [valor, setValor] = useState(vacio);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState("");
  const listo = useRef(false);
  const actual = useRef(vacio);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const res = await window.storage.get(clave);
        if (!vigente) return;
        if (res && res.value) { actual.current = JSON.parse(res.value); setValor(actual.current); }
        listo.current = true;
        setCargado(true);
      } catch {
        if (vigente) setError("No se pudo cargar. Revisa tu conexión.");
      }
    })();
    return () => { vigente = false; };
  }, [clave]);

  // Cambia el valor y lo guarda (acepta un valor o una función como setState).
  const guardar = useCallback((siguiente) => {
    if (!listo.current) return;
    const nuevo = typeof siguiente === "function" ? siguiente(actual.current) : siguiente;
    actual.current = nuevo;
    setValor(nuevo);
    window.storage.set(clave, JSON.stringify(nuevo)).then(() => setError("")).catch(() => setError("No se pudo guardar. Revisa tu conexión."));
  }, [clave]);

  return { valor, guardar, cargado, error };
}
