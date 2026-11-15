// Fondo de pantalla del CRM: devuelve una imagen PNG con los recordatorios de la semana y el avance de comisiones.
// Los montos van ocultos (•••); el detalle completo está en /api/detalle (se abre con un widget de Atajos).
// Uso:  /api/fondo?t=<token>&w=1206&h=2622
import { ImageResponse } from "@vercel/og";
import { leerDatos, armarResumen, etiquetaDia } from "./_lib/resumen.js";

export const config = { runtime: "edge" };

const h = (type, style, ...children) => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
});

const COLORES = { pago: "#E8B14F", renovacion: "#5CC48D", cumple: "#F08BB5", seguimiento: "#6FB1FF", actividad: "#B9C4D6" };

function error(msg, status) {
  return new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export default async function handler(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") || "";
  const w = Math.min(Math.max(parseInt(url.searchParams.get("w") || "1206", 10) || 1206, 600), 3000);
  const alto = Math.min(Math.max(parseInt(url.searchParams.get("h") || "2622", 10) || 2622, 800), 4000);

  const datos = await leerDatos(token);
  if (!datos) return error("Enlace no válido. Genera uno nuevo desde Ajustes del CRM.", 401);
  const r = armarResumen(datos);

  const s = w / 1206; // todo se escala respecto a un iPhone de 1206 px de ancho
  const px = (n) => Math.round(n * s);
  const ancho = w - px(140); // ancho útil de las tarjetas
  const vertical = alto >= w;
  const arriba = Math.round(alto * (vertical ? 0.4 : 0.3)); // deja libre el reloj de la pantalla bloqueada
  const abajo = Math.round(alto * 0.1);
  const maxFilas = Math.max(4, Math.min(10, Math.floor((alto - arriba - abajo - px(520)) / px(86))));

  const visibles = r.items.slice(0, maxFilas);
  const extra = r.items.length - visibles.length;

  const filas = visibles.map((it) =>
    h("div", { alignItems: "center", marginBottom: px(18) },
      h("div", { width: px(150), color: it.fecha === r.hoy ? "#FFFFFF" : "#9FB0C8", fontSize: px(34) }, etiquetaDia(it.fecha, r.hoy) + (it.hora ? "" : "")),
      h("div", { width: px(14), height: px(14), borderRadius: px(7), background: COLORES[it.tipo] || "#B9C4D6", marginRight: px(20) }),
      h("div", { flex: 1, color: "#F4F6FA", fontSize: px(38), whiteSpace: "nowrap", overflow: "hidden" }, (it.hora ? it.hora + "  " : "") + it.texto),
    ),
  );

  if (visibles.length === 0) {
    filas.push(h("div", { color: "#9FB0C8", fontSize: px(38) }, "Semana despejada. Buen momento para prospectar."));
  }
  if (extra > 0) filas.push(h("div", { color: "#C9A24B", fontSize: px(32), marginTop: px(4) }, `+ ${extra} más en el CRM`));

  const c = r.comision;
  const pct = c.avance === null ? null : Math.max(0, Math.min(1, c.avance));
  const barra = h("div", { width: ancho - px(88), height: px(18), borderRadius: px(9), background: "rgba(255,255,255,0.14)", marginTop: px(22) },
    h("div", { width: `${Math.round((pct === null ? 0 : pct) * 100)}%`, height: px(18), borderRadius: px(9), background: "linear-gradient(90deg,#C9A24B,#F1D48A)" }),
  );
  const pie = pct === null
    ? `${c.polizas} póliza${c.polizas === 1 ? "" : "s"} este mes · sin meta capturada`
    : `${c.polizas} póliza${c.polizas === 1 ? "" : "s"} · ${Math.round(pct * 100)}% de tu meta`;

  const tarjetaComision = h("div", { flexDirection: "column", boxSizing: "border-box", width: ancho, marginTop: px(34), padding: px(40), borderRadius: px(44), background: "rgba(255,255,255,0.08)", border: `${Math.max(1, px(2))}px solid rgba(255,255,255,0.16)` },
    h("div", { justifyContent: "space-between", alignItems: "center" },
      h("div", { color: "#C9A24B", fontSize: px(32), textTransform: "uppercase", letterSpacing: px(4) }, `Comisión de ${c.mes}`),
      h("div", { color: "#FFFFFF", fontSize: px(52) }, "$ • • • • •"),
    ),
    barra,
    h("div", { color: "#9FB0C8", fontSize: px(30), marginTop: px(18) }, pie),
  );

  const contenido = h("div", { flexDirection: "column", width: w, height: alto, paddingLeft: px(70), paddingRight: px(70), paddingTop: arriba, paddingBottom: abajo, background: "linear-gradient(170deg,#0B1F3A 0%,#12305A 60%,#0B1F3A 100%)" },
    h("div", { flexDirection: "column", boxSizing: "border-box", width: ancho, padding: px(44), borderRadius: px(44), background: "rgba(255,255,255,0.08)", border: `${Math.max(1, px(2))}px solid rgba(255,255,255,0.16)` },
      h("div", { justifyContent: "space-between", alignItems: "center", marginBottom: px(30) },
        h("div", { color: "#C9A24B", fontSize: px(32), textTransform: "uppercase", letterSpacing: px(4) }, "Tu semana"),
        r.vencidos > 0 ? h("div", { color: "#FF9A8B", fontSize: px(30) }, `${r.vencidos} pago${r.vencidos === 1 ? "" : "s"} vencido${r.vencidos === 1 ? "" : "s"}`) : h("div", { color: "#6F829F", fontSize: px(30) }, "al corriente"),
      ),
      ...filas,
    ),
    tarjetaComision,
  );

  return new ImageResponse(contenido, {
    width: w,
    height: alto,
    headers: { "cache-control": "no-store" },
  });
}
