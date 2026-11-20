import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Portal del cliente: devuelve SOLO los datos del cliente que inició sesión (por su correo).
const AGENT_ID_DEFAULT = "c3aca0b3-a1ae-4816-ab0c-4ebe5dddb777";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = "documentos";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

// Condiciones generales: se ligan a cada póliza por compañía y ramo desde la biblioteca compartida del CRM.
const sinAcentos = (t: unknown) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const claveCia = (t: unknown) => sinAcentos(t).replace(/\b(seguros|seguro|sa|s\.a\.|de|cv|c\.v\.)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const claveRamo = (t: unknown) => {
  const r = sinAcentos(t).trim();
  if (/^(gmm|salud|gastos medicos.*)$/.test(r)) return "salud";
  if (/(ppr|retiro)/.test(r)) return "retiro";
  return r;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    let body: any = {};
    try { body = await req.json(); } catch (_e) { /* sin cuerpo */ }
    const AGENT_ID = UUID.test(String(body?.agentId || "")) ? String(body.agentId) : AGENT_ID_DEFAULT;
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u, error: uerr } = await admin.auth.getUser(jwt);
    const correo = String(u?.user?.email || "").trim().toLowerCase();
    if (uerr || !correo) return resp({ error: "sesion" }, 401);

    const { data } = await admin.from("app_data").select("value").eq("agent_id", AGENT_ID).eq("key", "clients").maybeSingle();
    const clientes = Array.isArray(data?.value) ? data!.value : [];
    const c: any = clientes.find((x: any) => String(x?.correo || "").trim().toLowerCase() === correo);
    if (!c) return resp({ error: "no_cliente" }, 403);

    const polizas = [];
    for (const p of c.polizas || []) {
      let docUrl: string | null = null;
      if (p?.documento?.path) {
        const { data: s } = await admin.storage.from(BUCKET).createSignedUrl(p.documento.path, 3600);
        docUrl = s?.signedUrl || null;
      }
      polizas.push({
        id: p.id, aseguradora: p.aseguradora, ramo: p.ramo, numeroPoliza: p.numeroPoliza,
        primaAnual: p.primaAnual, pagoFraccionado: p.pagoFraccionado, metodoPago: p.metodoPago,
        moneda: p.moneda, inicioVigencia: p.inicioVigencia, finVigencia: p.finVigencia,
        fechaPago: p.fechaPago, fechaRenovacion: p.fechaRenovacion,
        deducible: p.deducible, coaseguroPct: p.coaseguroPct, topeCoaseguro: p.topeCoaseguro,
        docUrl,
      });
    }
    // Condiciones generales que le corresponden a cada póliza (misma compañía y ramo)
    const { data: cgs } = await admin.from("material_compartido").select("id, nombre, path, ramo, aseguradora, created_at").eq("seccion", "condiciones").order("created_at", { ascending: false });
    const firmadas = new Map<string, string | null>();
    for (const pol of polizas as any[]) {
      const ciaP = claveCia(pol.aseguradora);
      const ramoP = claveRamo(pol.ramo);
      const docs = [];
      for (const d of cgs || []) {
        if (!ciaP || claveCia(d.aseguradora) !== ciaP || claveRamo(d.ramo) !== ramoP || !d.path) continue;
        if (!firmadas.has(d.path)) {
          const { data: s3 } = await admin.storage.from(BUCKET).createSignedUrl(d.path, 3600);
          firmadas.set(d.path, s3?.signedUrl || null);
        }
        const url = firmadas.get(d.path);
        if (url) docs.push({ id: d.id, name: d.nombre, url });
      }
      pol.condiciones = docs;
    }
    // Datos de contacto del agente (tarjeta pública)
    const { data: card } = await admin.from("public_cards").select("nombre, correo, telefono, whatsapp, foto_url").eq("agent_id", AGENT_ID).maybeSingle();
    const agente = { id: AGENT_ID, nombre: card?.nombre || "", correo: card?.correo || "", whatsapp: card?.whatsapp || card?.telefono || "", telefono: card?.telefono || card?.whatsapp || "", fotoUrl: card?.foto_url || "" };
    // Información de siniestros capturada por el agente (teléfonos, instrucciones, archivos)
    const { data: sin } = await admin.from("app_data").select("value").eq("agent_id", AGENT_ID).eq("key", "siniestros_info").maybeSingle();
    const siniestros = [];
    for (const x of Array.isArray(sin?.value) ? sin!.value : []) {
      const docs = [];
      for (const d of x?.docs || []) {
        if (!d?.path) continue;
        const { data: s2 } = await admin.storage.from(BUCKET).createSignedUrl(d.path, 3600);
        if (s2?.signedUrl) docs.push({ id: d.id, name: d.name, url: s2.signedUrl });
      }
      siniestros.push({ id: x.id, aseguradora: x.aseguradora || "", telefonos: (x.telefonos || []).filter((t: any) => t?.numero), instrucciones: x.instrucciones || "", docs });
    }
    return resp({ cliente: { nombre: c.nombre, apellido: c.apellido || "" }, polizas, agente, siniestros });
  } catch (e) {
    return resp({ error: "error", detalle: String(e) }, 500);
  }
});
