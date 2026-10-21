import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Activación del portal de clientes con contraseña.
//  - crear:   el AGENTE (con su sesión del CRM) genera un enlace de un solo uso para un cliente.
//  - info:    el cliente abre el enlace y ve su nombre/correo.
//  - activar: el cliente crea su contraseña con el enlace.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const DIAS = 7;

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
const nuevoToken = () => {
  const a = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    let body: any = {};
    try { body = await req.json(); } catch (_e) { /* sin cuerpo */ }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const accion = String(body?.accion || "");

    // ───── Agente: generar enlace ─────
    if (accion === "crear") {
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: u, error: uerr } = await admin.auth.getUser(jwt);
      if (uerr || !u?.user) return resp({ error: "sesion" }, 401);
      if (u.user.user_metadata?.rol === "cliente") return resp({ error: "permiso" }, 403);
      const agentId = u.user.id;
      const { data } = await admin.from("app_data").select("value").eq("agent_id", agentId).eq("key", "clients").maybeSingle();
      const clientes = Array.isArray(data?.value) ? data!.value : [];
      const c: any = clientes.find((x: any) => String(x?.id) === String(body?.clientId));
      if (!c) return resp({ error: "cliente" }, 404);
      const correo = String(c.correo || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return resp({ error: "sin_correo" }, 400);
      if (correo === String(u.user.email || "").toLowerCase()) return resp({ error: "correo_agente" }, 400);
      const token = nuevoToken();
      // Invalida enlaces anteriores sin usar de este cliente
      await admin.from("portal_activaciones").delete().eq("agent_id", agentId).eq("client_id", String(c.id)).is("used_at", null);
      const { error: ierr } = await admin.from("portal_activaciones").insert({
        token_hash: await sha256(token), agent_id: agentId, client_id: String(c.id), email: correo,
        nombre: [c.nombre].filter(Boolean).join(" "), expires_at: new Date(Date.now() + DIAS * 86400000).toISOString(),
      });
      if (ierr) return resp({ error: "error", detalle: ierr.message }, 500);
      return resp({ token, correo, dias: DIAS });
    }

    // ───── Cliente: consultar / activar ─────
    const token = String(body?.token || "");
    if (!/^[0-9a-f]{48}$/.test(token)) return resp({ error: "enlace_invalido" }, 400);
    const { data: act } = await admin.from("portal_activaciones").select("*").eq("token_hash", await sha256(token)).maybeSingle();
    if (!act || act.used_at || new Date(act.expires_at) < new Date()) return resp({ error: "enlace_invalido" }, 400);

    if (accion === "info") {
      return resp({ nombre: String(act.nombre || "").split(" ")[0], correo: act.email, agentId: act.agent_id });
    }

    if (accion === "activar") {
      const password = String(body?.password || "");
      if (password.length < 8) return resp({ error: "password_corta" }, 400);
      // ¿Ya existe un usuario con ese correo?
      let existente: any = null;
      for (let page = 1; page <= 10 && !existente; page++) {
        const { data: l } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        existente = l?.users?.find((x: any) => String(x.email || "").toLowerCase() === act.email) || null;
        if (!l?.users || l.users.length < 1000) break;
      }
      if (existente) {
        // Nunca tocar cuentas de agentes (Google u otras): solo cuentas de cliente
        if (existente.user_metadata?.rol !== "cliente") return resp({ error: "cuenta_no_permitida" }, 403);
        const { error } = await admin.auth.admin.updateUserById(existente.id, { password, email_confirm: true });
        if (error) return resp({ error: "error", detalle: error.message }, 500);
      } else {
        const { error } = await admin.auth.admin.createUser({ email: act.email, password, email_confirm: true, user_metadata: { rol: "cliente" } });
        if (error) return resp({ error: "error", detalle: error.message }, 500);
      }
      await admin.from("portal_activaciones").update({ used_at: new Date().toISOString() }).eq("id", act.id);
      return resp({ ok: true, correo: act.email });
    }
    return resp({ error: "accion" }, 400);
  } catch (e) {
    return resp({ error: "error", detalle: String(e) }, 500);
  }
});
