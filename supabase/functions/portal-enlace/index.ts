import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Portal del cliente: envía el enlace de acceso SOLO si el correo pertenece a un cliente de Joshua.
// Siempre responde lo mismo (exista o no el correo) para no revelar quién es cliente.
const AGENT_ID_DEFAULT = "c3aca0b3-a1ae-4816-ab0c-4ebe5dddb777";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const ok = () => new Response(JSON.stringify({ ok: true }), { headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, redirectTo, agentId } = await req.json();
    const AGENT_ID = UUID.test(String(agentId || "")) ? String(agentId) : AGENT_ID_DEFAULT;
    const correo = String(email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return ok();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await admin.from("app_data").select("value").eq("agent_id", AGENT_ID).eq("key", "clients").maybeSingle();
    const clientes = Array.isArray(data?.value) ? data!.value : [];
    const existe = clientes.some((c: any) => String(c?.correo || "").trim().toLowerCase() === correo);
    if (!existe) return ok();

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    await anon.auth.signInWithOtp({
      email: correo,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo, data: { rol: "cliente" } },
    });
    return ok();
  } catch (_e) {
    return ok();
  }
});
