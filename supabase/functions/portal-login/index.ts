import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Inicio de sesión del portal con el número de WhatsApp: se busca el correo del cliente
// en el expediente del agente y se valida la contraseña aquí, sin revelar el correo.
const AGENT_ID_DEFAULT = "c3aca0b3-a1ae-4816-ab0c-4ebe5dddb777";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const fallo = () => resp({ error: "credenciales" }, 401);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    let body: any = {};
    try { body = await req.json(); } catch (_e) { /* sin cuerpo */ }
    const agentId = UUID.test(String(body?.agentId || "")) ? String(body.agentId) : AGENT_ID_DEFAULT;
    const digitos = String(body?.telefono || "").replace(/\D/g, "").slice(-10);
    const password = String(body?.password || "");
    if (digitos.length !== 10 || !password) return fallo();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await admin.from("app_data").select("value").eq("agent_id", agentId).eq("key", "clients").maybeSingle();
    const clientes = Array.isArray(data?.value) ? data!.value : [];
    const correos = new Set<string>();
    for (const c of clientes as any[]) {
      const t = String(c?.telefono || "").replace(/\D/g, "").slice(-10);
      const m = String(c?.correo || "").trim().toLowerCase();
      if (t === digitos && m.includes("@")) correos.add(m);
    }
    if (correos.size !== 1) return fallo(); // sin coincidencia o número repetido en varios clientes
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data: s, error } = await anon.auth.signInWithPassword({ email: [...correos][0], password });
    if (error || !s?.session) return fallo();
    return resp({ access_token: s.session.access_token, refresh_token: s.session.refresh_token });
  } catch (_e) {
    return fallo();
  }
});
