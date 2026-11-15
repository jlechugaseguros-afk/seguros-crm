// Detalle completo (con montos) de la semana y las comisiones. Se abre desde un widget de Atajos en la pantalla bloqueada,
// lo que obliga a desbloquear el equipo antes de verlo.  Uso:  /api/detalle?t=<token>
import { leerDatos, armarResumen, etiquetaDia, fmtMXN, fmtFechaCorta } from "./_lib/resumen.js";

export const config = { runtime: "edge" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ICONOS = { pago: "💳", renovacion: "🔄", cumple: "🎂", seguimiento: "📞", actividad: "📌" };
const COLORES = { pago: "#E8B14F", renovacion: "#2F9E63", cumple: "#D9709B", seguimiento: "#2B6CB0", actividad: "#6B7A90" };

function pagina(cuerpo, status = 200) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><title>Mi semana · J L CRM</title>
<style>
:root{--ink:#0B1F3A;--gold:#C9A24B;--bg:#F4F1EA;--card:#fff;--tx:#1B2A41;--mut:#6B7A90}
@media (prefers-color-scheme:dark){:root{--bg:#0B1F3A;--card:#12305A;--tx:#F4F6FA;--mut:#9FB0C8}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:max(16px,env(safe-area-inset-top)) 16px 32px}
main{max-width:560px;margin:0 auto}h1{font:600 28px Georgia,serif;margin:8px 0 2px}p.sub{color:var(--mut);margin:0 0 18px}
.card{background:var(--card);border-radius:20px;padding:18px;margin-bottom:16px;box-shadow:0 1px 8px rgba(11,31,58,.08)}
h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:0 0 12px}
.fila{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid rgba(127,140,160,.2)}.fila:first-of-type{border-top:0}
.dia{width:64px;color:var(--mut);font-size:14px;flex:none}.dia.hoy{color:var(--tx);font-weight:700}
.pto{width:10px;height:10px;border-radius:50%;flex:none}.txt{flex:1}.sm{color:var(--mut);font-size:13px}.monto{font-weight:600;white-space:nowrap}
.grande{font:600 34px Georgia,serif}.barra{height:12px;border-radius:6px;background:rgba(127,140,160,.25);margin:12px 0 6px;overflow:hidden}.barra i{display:block;height:100%;background:linear-gradient(90deg,#C9A24B,#F1D48A)}
.venc{color:#C7473B;font-weight:600}
</style></head><body><main>${cuerpo}</main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export default async function handler(req) {
  const token = new URL(req.url).searchParams.get("t") || "";
  const datos = await leerDatos(token);
  if (!datos) return pagina(`<h1>Enlace no válido</h1><p class="sub">Genera uno nuevo desde Ajustes del CRM.</p>`, 401);
  const r = armarResumen(datos);
  const c = r.comision;

  const filas = r.items.map((it) => `<div class="fila"><span class="dia${it.fecha === r.hoy ? " hoy" : ""}">${esc(etiquetaDia(it.fecha, r.hoy))}</span><span class="pto" style="background:${COLORES[it.tipo]}"></span><span class="txt">${ICONOS[it.tipo] || ""} ${esc(it.hora ? it.hora + " · " : "")}${esc(it.texto)}${it.monto ? `<div class="sm">${esc(it.ramo)} ${esc(it.tipo === "renovacion" ? "prima anual" : "")}</div>` : ""}</span>${it.monto ? `<span class="monto">${fmtMXN(it.monto)}</span>` : ""}</div>`).join("");

  const pct = c.avance === null ? null : Math.max(0, Math.min(1, c.avance));
  const cuerpo = `
<h1>Hola${r.nombre ? ", " + esc(r.nombre.split(" ")[0]) : ""}</h1>
<p class="sub">Del ${esc(fmtFechaCorta(r.hoy))} al ${esc(fmtFechaCorta(r.fin))}${r.vencidos ? ` · <span class="venc">${r.vencidos} pago${r.vencidos === 1 ? "" : "s"} vencido${r.vencidos === 1 ? "" : "s"}</span>` : ""}</p>
<section class="card"><h2>Comisión de ${esc(c.mes)}</h2>
<div class="grande">${fmtMXN(c.monto)}</div>
<div class="sm">${c.polizas} póliza${c.polizas === 1 ? "" : "s"} nueva${c.polizas === 1 ? "" : "s"} · prima ${fmtMXN(c.prima)}</div>
${pct === null ? `<div class="sm" style="margin-top:10px">Aún no capturas una meta del mes en Comisiones.</div>` : `<div class="barra"><i style="width:${Math.round(pct * 100)}%"></i></div><div class="sm">${Math.round(pct * 100)}% de tu meta${c.metaPrima > 0 ? ` (prima ${fmtMXN(c.metaPrima)})` : ` (${c.metaPolizas} pólizas)`}</div>`}
</section>
<section class="card"><h2>Recordatorios de la semana</h2>${filas || `<div class="sm">Semana despejada.</div>`}</section>`;
  return pagina(cuerpo);
}
