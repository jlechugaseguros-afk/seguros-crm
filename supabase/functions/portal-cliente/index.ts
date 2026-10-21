import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Portal del cliente: devuelve SOLO los datos del cliente que inició sesión (por su correo).
const AGENT_ID = "c3aca0b3-a1ae-4816-ab0c-4ebe5dddb777";
const BUCKET = "documentos";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
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
    return resp({ cliente: { nombre: c.nombre, apellido: c.apellido || "" }, polizas });
  } catch (e) {
    return resp({ error: "error", detalle: String(e) }, 500);
  }
});
