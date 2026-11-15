// Fondo de pantalla del CRM: imagen PNG pensada para verse de reojo muchas veces al día.
//  1) Lo siguiente que tienes que hacer  2) Resumen de hoy  3) Tira de la semana  4) Ritmo de tu meta.
// Sin montos: el detalle completo (con montos y botones Llamar/WhatsApp) está en /api/detalle.
// Uso:  /api/fondo?t=<token>&w=1206&h=2622
import { dibujarPNG } from "./_lib/imagen.js";
import { aNode } from "./_lib/nodo.js";
import { leerDatos, armarResumen } from "./_lib/resumen.js";

const h = (type, style, ...children) => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
});

const ORO = "#C9A24B";
const TARJETA = { background: "rgba(255,255,255,0.08)", borderStyle: "solid", borderColor: "rgba(255,255,255,0.16)" };

function error(msg, status) {
  return new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

async function manejar(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") || "";
  const w = Math.min(Math.max(parseInt(url.searchParams.get("w") || "1206", 10) || 1206, 600), 3000);
  const alto = Math.min(Math.max(parseInt(url.searchParams.get("h") || "2622", 10) || 2622, 800), 4000);

  const datos = await leerDatos(token);
  if (!datos) return error("Enlace no válido. Genera uno nuevo desde Ajustes del CRM.", 401);
  const r = armarResumen(datos);

  // Todo se escala respecto a un iPhone de 1206 x 2622 px; en iPad se limita por la altura.
  const s = Math.min(w / 1206, alto / 2622);
  const px = (n) => Math.max(1, Math.round(n * s));
  const ancho = Math.min(w - px(140), px(1066)); // ancho útil de las tarjetas
  const arriba = Math.round(alto * 0.4); // deja libre el reloj de la pantalla bloqueada
  const borde = px(2);
  const caja = (extra, ...hijos) => h("div", { boxSizing: "border-box", width: ancho, flexDirection: "column", borderRadius: px(44), borderWidth: borde, ...TARJETA, ...extra }, ...hijos);
  const etiqueta = (t) => h("div", { color: ORO, fontSize: px(28), textTransform: "uppercase", letterSpacing: px(4) }, t);

  // 1) Siguiente acción
  const sg = r.siguiente;
  const tarjetaSiguiente = caja({ padding: px(40) },
    etiqueta("Lo siguiente"),
    sg
      ? h("div", { flexDirection: "column", marginTop: px(16) },
        h("div", { alignItems: "center", justifyContent: "space-between" },
          h("div", { color: "#FFFFFF", fontSize: px(66), whiteSpace: "nowrap" }, `${sg.hora ? sg.hora + " · " : ""}${sg.titulo}`),
        ),
        h("div", { alignItems: "center", justifyContent: "space-between", marginTop: px(8) },
          h("div", { color: "#DCE4F0", fontSize: px(44), whiteSpace: "nowrap" }, sg.quien || " "),
          h("div", { color: "#0B1F3A", background: "#F1D48A", fontSize: px(32), paddingLeft: px(22), paddingRight: px(22), paddingTop: px(8), paddingBottom: px(8), borderRadius: px(30) }, sg.cuando),
        ),
      )
      : h("div", { flexDirection: "column", marginTop: px(16) },
        h("div", { color: "#FFFFFF", fontSize: px(56) }, "Sin pendientes por ahora"),
        h("div", { color: "#9FB0C8", fontSize: px(36), marginTop: px(8) }, "Buen momento para prospectar"),
      ),
  );

  // 2) Resumen de hoy
  const conteosTxt = r.conteosHoy.slice(0, 4).map((c) => c.texto).join("  ·  ");
  const tarjetaHoy = caja({ marginTop: px(28), padding: px(40) },
    etiqueta("Hoy"),
    h("div", { color: r.conteosHoy.length ? "#F4F6FA" : "#9FB0C8", fontSize: px(44), marginTop: px(14), whiteSpace: "nowrap" }, conteosTxt || "Sin pendientes agendados"),
    r.vencidos > 0
      ? h("div", { color: "#FF9A8B", fontSize: px(36), marginTop: px(14) }, `${r.vencidos} pago${r.vencidos === 1 ? "" : "s"} vencido${r.vencidos === 1 ? "" : "s"} por cobrar`)
      : null,
  );

  // 3) Tira de la semana
  const colAncho = Math.floor((ancho - px(80)) / 7);
  const tira = caja({ marginTop: px(28), paddingTop: px(26), paddingBottom: px(26), paddingLeft: px(40), paddingRight: px(40), flexDirection: "row", justifyContent: "space-between" },
    ...r.tira.map((d) =>
      h("div", { flexDirection: "column", alignItems: "center", width: colAncho, paddingTop: px(10), paddingBottom: px(10), borderRadius: px(26), background: d.esHoy ? "rgba(201,162,75,0.22)" : "transparent" },
        h("div", { color: d.esHoy ? ORO : "#9FB0C8", fontSize: px(28) }, d.letra),
        h("div", { color: "#FFFFFF", fontSize: px(40), marginTop: px(4) }, String(d.num)),
        h("div", { color: d.n ? ORO : "#4F6486", fontSize: px(30), marginTop: px(6) }, d.n ? "●".repeat(Math.min(d.n, 3)) : "·"),
      ),
    ),
  );

  // 4) Ritmo de la meta (sin montos)
  const c = r.comision;
  const pct = c.avance === null ? 0 : Math.max(0, Math.min(1, c.avance));
  const anchoBarra = ancho - px(80) - borde * 2;
  const tarjetaMeta = caja({ marginTop: px(28), padding: px(40) },
    h("div", { justifyContent: "space-between", alignItems: "center" },
      etiqueta(`Meta de ${c.mes}`),
      h("div", { color: "#FFFFFF", fontSize: px(44) }, c.avance === null ? "—" : `${Math.round(pct * 100)}%`),
    ),
    h("div", { width: anchoBarra, height: px(18), borderRadius: px(9), background: "rgba(255,255,255,0.14)", marginTop: px(20) },
      h("div", { width: Math.max(px(18), Math.round(anchoBarra * pct)), height: px(18), borderRadius: px(9), background: "linear-gradient(90deg,#C9A24B,#F1D48A)" }),
    ),
    h("div", { color: "#C9D3E3", fontSize: px(32), marginTop: px(18) }, c.ritmo),
  );

  const contenido = h("div", { flexDirection: "column", alignItems: "center", width: w, height: alto, paddingTop: arriba, background: "linear-gradient(170deg,#0B1F3A 0%,#12305A 60%,#0B1F3A 100%)" },
    tarjetaSiguiente, tarjetaHoy, tira, tarjetaMeta,
  );

  const png = await dibujarPNG(contenido, w, alto);
  return new Response(png, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}

export default aNode(manejar);
