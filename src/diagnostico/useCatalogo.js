import { useEffect, useMemo, useState, useCallback } from "react";
import { CATALOGO_BASE } from "./catalogoBase.js";

const KEY = "diag_catalogo";

// Catálogo = productos base + los que el agente agrega o edita (se guardan en app_data).
// Un producto guardado con el mismo id reemplaza al base; con oculto:true se esconde.
export function useCatalogo() {
  const [propios, setPropios] = useState([]);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(KEY);
        if (res && res.value) setPropios(JSON.parse(res.value));
      } catch { /* sin datos propios todavía */ }
      setListo(true);
    })();
  }, []);

  const guardar = useCallback(async (nuevos) => {
    setPropios(nuevos);
    try { await window.storage.set(KEY, JSON.stringify(nuevos)); setError(""); }
    catch { setError("No se pudo guardar el catálogo. Revisa tu conexión."); }
  }, []);

  const catalogo = useMemo(() => {
    const porId = new Map(propios.map((p) => [p.id, p]));
    const base = CATALOGO_BASE.map((b) => (porId.has(b.id) ? { ...b, ...porId.get(b.id), base: true } : { ...b, base: true }));
    const baseIds = new Set(CATALOGO_BASE.map((b) => b.id));
    const extra = propios.filter((p) => !baseIds.has(p.id)).map((p) => ({ ...p, base: false }));
    return [...base, ...extra];
  }, [propios]);

  const guardarProducto = (p) => guardar([...propios.filter((x) => x.id !== p.id), p]);
  const quitarProducto = (p) => {
    if (p.base) return guardar([...propios.filter((x) => x.id !== p.id), { id: p.id, oculto: true }]);
    return guardar(propios.filter((x) => x.id !== p.id));
  };
  const restaurar = (id) => guardar(propios.filter((x) => x.id !== id));
  const importar = (lista) => {
    const ids = new Set(lista.map((p) => p.id));
    return guardar([...propios.filter((x) => !ids.has(x.id)), ...lista]);
  };

  return { catalogo, propios, listo, error, guardarProducto, quitarProducto, restaurar, importar };
}
