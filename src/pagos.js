// Cálculos de fechas y pagos de pólizas, compartidos por el CRM, Cobranza y Renovaciones.

// --- Pagos fraccionados ---
// La "fecha del primer pago" es el ancla; de ahí se generan los pagos de la vigencia
// según la periodicidad (Mensual 12, Trimestral 4, Semestral 2, Anual 1).
export const PAGOS_POR_ANIO = { Mensual: 12, Trimestral: 4, Semestral: 2, Anual: 1 };
export const MESES_ENTRE_PAGOS = { Mensual: 1, Trimestral: 3, Semestral: 6, Anual: 12 };

export function addMonthsStr(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const total = (m - 1) + months;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const last = new Date(ny, nm + 1, 0).getDate(); // evita 31 de feb, etc.
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

// Devuelve [{ date, numero, total, monto }] con todos los pagos de la póliza.
export function pagosDePoliza(p) {
  if (!p || !p.fechaPago) return [];
  const total = PAGOS_POR_ANIO[p.pagoFraccionado] || 1;
  const paso = MESES_ENTRE_PAGOS[p.pagoFraccionado] || 12;
  const prima = Number(p.primaAnual) || 0;
  const monto = prima > 0 ? Math.round((prima / total) * 100) / 100 : 0;
  const limite = p.finVigencia || p.fechaRenovacion || "";
  const pagos = [];
  for (let k = 0; k < total; k++) {
    const date = addMonthsStr(p.fechaPago, k * paso);
    if (k > 0 && limite && date >= limite) break;
    pagos.push({ date, numero: k + 1, total, monto });
  }
  return pagos;
}

export function fmtMonto(n) {
  return n ? `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "";
}

export function daysUntil(dateStr, recurring) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  if (recurring) {
    // Cumpleaños: se repite cada año, el año guardado no importa.
    let target = new Date(today.getFullYear(), m - 1, d);
    if (target < today) target = new Date(today.getFullYear() + 1, m - 1, d);
    return Math.round((target - today) / 86400000);
  }
  // Pago / renovación: fecha exacta, el año sí importa.
  const target = new Date(y, m - 1, d);
  return Math.round((target - today) / 86400000);
}

export function fmtDateFull(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]} ${y}`;
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
