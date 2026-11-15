// Detalle accionable (con montos): por cobrar, hoy, resto de la semana y comisiones, con botones Llamar y WhatsApp.
// Se abre desde un widget de Atajos en la pantalla bloqueada, lo que obliga a desbloquear el equipo antes de verlo.
// Uso:  /api/detalle?t=<token>
import { aNode } from "./_lib/nodo.js";
import { leerDatos, armarResumen, etiquetaDia, fmtMXN, fmtFechaCorta, linkWa, linkTel } from "./_lib/resumen.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ICONOS = { pago: "💳", renovacion: "🔄", cumple: "🎂", seguimiento: "📞", actividad: "📌" };
const COLORES = { pago: "#E8B14F", renovacion: "#2F9E63", cumple: "#D9709B", seguimiento: "#2B6CB0", actividad: "#6B7A90" };

function pagina(cuerpo, status = 200) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><title>Mi día · J L CRM</title>
<style>
:root{--ink:#0B1F3A;--gold:#C9A24B;--bg:#F4F1EA;--card:#fff;--tx:#1B2A41;--mut:#6B7A90;--line:rgba(127,140,160,.22)}
@media (prefers-color-scheme:dark){:root{--bg:#0B1F3A;--card:#12305A;--tx:#F4F6FA;--mut:#9FB0C8}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:max(16px,env(safe-area-inset-top)) 16px 40px}
main{max-width:560px;margin:0 auto}h1{font:600 28px Georgia,serif;margin:8px 0 2px}p.sub{color:var(--mut);margin:0 0 18px}
.card{background:var(--card);border-radius:20px;padding:18px;margin-bottom:16px;box-shadow:0 1px 8px rgba(11,31,58,.08)}
.card.alerta{border-left:5px solid #C7473B}
h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:0 0 6px}
.fila{padding:12px 0;border-top:1px solid var(--line)}.fila:first-of-type{border-top:0}
.top{display:flex;gap:10px;align-items:center}.pto{width:10px;height:10px;border-radius:50%;flex:none}.txt{flex:1;min-width:0}
.dia{color:var(--mut);font-size:13px}.monto{font-weight:600;white-space:nowrap}.sm{color:var(--mut);font-size:13px}
.acc{display:flex;gap:8px;margin-top:10px}.acc a{flex:1;text-align:center;text-decoration:none;font-weight:600;font-size:15px;padding:10px 0;border-radius:12px}
.llamar{background:var(--ink);color:#fff}.wa{background:#1FA855;color:#fff}
@media (prefers-color-scheme:dark){.llamar{background:#F4F6FA;color:#0B1F3A}}
.grande{font:600 34px Georgia,serif}.barra{height:12px;border-radius:6px;background:rgba(127,140,160,.25);margin:12px 0 6px;overflow:hidden}.barra i{display:block;height:100%;background:linear-gradient(90deg,#C9A24B,#F1D48A)}
.rojo{color:#C7473B;font-weight:600}.vacio{color:var(--mut);padding:6px 0}
</style></head><body><main>${cuerpo}</main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

const botones = (tel, wa) => {
  const t = linkTel(tel);
  const w = wa ? linkWa(tel, wa) : "";
  if (!t && !w) return "";
  return `<div class="acc">${t ? `<a class="llamar" href="${esc(t)}">Llamar</a>` : ""}${w ? `<a class="wa" href="${esc(w)}">WhatsApp</a>` : ""}</div>`;
};

function filaItem(it, hoy, mostrarDia) {
  return `<div class="fila"><div class="top"><span class="pto" style="background:${COLORES[it.tipo]}"></span><div class="txt">${ICONOS[it.tipo] || ""} ${esc(it.hora ? it.hora + " · " : "")}${esc(it.texto)}${mostrarDia ? `<div class="dia">${esc(etiquetaDia(it.fecha, hoy))}</div>` : ""}${it.monto ? `<div class="sm">${esc(it.ramo)}${it.tipo === "renovacion" ? " · prima anual" : ""}</div>` : ""}</div>${it.monto ? `<span class="monto">${fmtMXN(it.monto)}</span>` : ""}</div>${botones(it.tel, it.wa)}</div>`;
}

async function manejar(req) {
  const token = new URL(req.url).searchParams.get("t") || "";
  const datos = await leerDatos(token);
  if (!datos) return pagina(`<h1>Enlace no válido</h1><p class="sub">Genera uno nuevo desde Ajustes del CRM.</p>`, 401);
  const r = armarResumen(datos);
  const c = r.comision;

  const vencidos = r.vencidosLista.map((v) => `<div class="fila"><div class="top"><span class="pto" style="background:#C7473B"></span><div class="txt">${esc(v.texto)}<div class="rojo">${v.dias} día${v.dias === 1 ? "" : "s"} de retraso · venció ${esc(fmtFechaCorta(v.fecha))}</div><div class="sm">${esc(v.ramo)}</div></div>${v.monto ? `<span class="monto">${fmtMXN(v.monto)}</span>` : ""}</div>${botones(v.tel, v.wa)}</div>`).join("");
  const totalVencido = r.vencidosLista.reduce((s, v) => s + (Number(v.monto) || 0), 0);

  const deHoy = r.items.filter((i) => i.fecha === r.hoy);
  const resto = r.items.filter((i) => i.fecha !== r.hoy);
  const pct = c.avance === null ? null : Math.max(0, Math.min(1, c.avance));

  const cuerpo = `
<h1>Hola${r.nombre ? ", " + esc(r.nombre.split(" ")[0]) : ""}</h1>
<p class="sub">${esc(fmtFechaCorta(r.hoy))} · semana al ${esc(fmtFechaCorta(r.fin))}</p>
${r.vencidosLista.length ? `<section class="card alerta"><h2>Por cobrar · ${r.vencidosLista.length}${totalVencido ? " · " + fmtMXN(totalVencido) : ""}</h2>${vencidos}</section>` : ""}
<section class="card"><h2>Hoy</h2>${deHoy.length ? deHoy.map((i) => filaItem(i, r.hoy, false)).join("") : `<div class="vacio">Nada agendado para hoy. Buen momento para prospectar.</div>`}</section>
<section class="card"><h2>Comisión de ${esc(c.mes)}</h2>
<div class="grande">${fmtMXN(c.monto)}</div>
<div class="sm">${c.polizas} póliza${c.polizas === 1 ? "" : "s"} nueva${c.polizas === 1 ? "" : "s"} · prima ${fmtMXN(c.prima)}</div>
${pct === null ? "" : `<div class="barra"><i style="width:${Math.round(pct * 100)}%"></i></div><div class="sm">${Math.round(pct * 100)}% de tu meta${c.metaPrima > 0 ? ` (prima ${fmtMXN(c.metaPrima)})` : ` (${c.metaPolizas} pólizas)`}</div>`}
<div class="sm" style="margin-top:8px">${esc(c.ritmo)}</div>
${c.porRamo.length ? `<div style="margin-top:12px">${c.porRamo.map((x) => `<div class="sm" style="display:flex;justify-content:space-between;margin-top:6px"><span>${esc(x.ramo)}</span><b>${x.meta > 0 ? `${x.vend} / ${x.meta}` : x.vend} póliza${x.vend === 1 ? "" : "s"}</b></div>${x.meta > 0 ? `<div class="barra"><i style="width:${Math.round(Math.min(1, x.vend / x.meta) * 100)}%"></i></div>` : ""}`).join("")}</div>` : ""}
</section>
<section class="card"><h2>Resto de la semana</h2>${resto.length ? resto.map((i) => filaItem(i, r.hoy, true)).join("") : `<div class="vacio">Sin más pendientes esta semana.</div>`}</section>`;
  return pagina(cuerpo);
}

export default aNode(manejar);
