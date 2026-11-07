// Tipos de actividad del Planificador, agrupados por color de semáforo:
//  verde    = representan una venta
//  amarillo = te acercan a vender o impactan tu meta
//  rojo     = netamente administrativas
export const SEMAFORO = {
  verde: { color: "#2F9E63", soft: "#E3F4EA", label: "Venta" },
  amarillo: { color: "#D9A21B", soft: "#FBF1D3", label: "Te acerca a vender / impacta tu meta" },
  rojo: { color: "#C7473B", soft: "#FBE5E2", label: "Administrativa" },
};

export const TIPOS_POR_COLOR = {
  verde: ["Cierre de venta", "Firma de solicitud", "Entrega de póliza", "Renovación"],
  amarillo: ["Prospección", "Llamada", "Whatsapp", "Correo", "Reunión Virtual", "Cita Presencial", "Visita", "Reunión", "Cotización", "Seguimiento", "Pedir referidos"],
  rojo: ["Trámite", "Siniestro", "Cobranza", "Documentos", "Tarea", "Otro"],
};

export const TIPO_DEFECTO = "Llamada";

const TIPO_A_COLOR = {};
Object.entries(TIPOS_POR_COLOR).forEach(([color, tipos]) => tipos.forEach((t) => { TIPO_A_COLOR[t] = color; }));

// Color de semáforo de una actividad. Si el tipo no está en la lista (actividades antiguas),
// las ligadas a un prospecto cuentan como "te acercan a vender" y el resto como administrativas.
export function colorDeActividad(a) {
  return TIPO_A_COLOR[a.tipo] || (a.prospectoId ? "amarillo" : "rojo");
}

// Color de semáforo de los recordatorios automáticos del calendario.
export const COLOR_RECORDATORIO = { pago: "rojo", renovacion: "verde", cumple: "amarillo" };

export const ESTATUS_ACTIVIDAD = ["Pendiente", "Activa", "Urgente", "Confirmado", "En espera", "Completado", "Cancelado", "Fallido"];
export const ESTATUS_DEFECTO = "Pendiente";
export const ESTATUS_CERRADOS = ["Completado", "Cancelado", "Fallido"];

export const REPETICIONES = [
  { value: "", label: "No se repite" },
  { value: "diario", label: "Todos los días" },
  { value: "semanal", label: "Cada semana" },
  { value: "mensual", label: "Cada mes" },
  { value: "anual", label: "Cada año" },
];

const DIA = 86400000;
function aFecha(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

// ¿La actividad ocurre en esa fecha (YYYY-MM-DD)? Considera la repetición.
export function ocurreEn(a, fecha) {
  if (!a.fecha) return false;
  if (a.fecha === fecha) return true;
  if (!a.repite || fecha < a.fecha) return false;
  const x = aFecha(fecha);
  const b = aFecha(a.fecha);
  switch (a.repite) {
    case "diario": return true;
    case "semanal": return Math.round((x - b) / DIA) % 7 === 0;
    case "mensual": return x.getDate() === b.getDate();
    case "anual": return x.getDate() === b.getDate() && x.getMonth() === b.getMonth();
    default: return false;
  }
}

export function actividadesDelDia(activities, fecha) {
  return (activities || []).filter((a) => ocurreEn(a, fecha)).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
}

export function duracionMin(hora, horaFin) {
  if (!hora || !horaFin) return 60;
  const [h1, m1] = hora.split(":").map(Number);
  const [h2, m2] = horaFin.split(":").map(Number);
  const d = (h2 * 60 + m2) - (h1 * 60 + m1);
  return d > 0 ? d : 60;
}

export function fmtFechaCortaISO(f) {
  if (!f) return "";
  const [y, m, d] = f.split("-");
  return y && m && d ? `${d}/${m}/${y}` : f;
}

export function fmtFechaHoraTs(ts) {
  try { return new Date(ts).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}
