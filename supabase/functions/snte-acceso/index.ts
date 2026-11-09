import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Acceso al Espacio SNTE (McBrokers). El agente debe dar su correo y su clave de asesor.
// La validación ocurre aquí, en el servidor: las claves nunca llegan al navegador.
//  - estado: dice si la cuenta ya quedó ligada a un asesor
//  - entrar: valida correo + clave y liga la cuenta del CRM con el asesor (para ver solo su cartera)
// Límite: 5 intentos fallidos en 15 minutos por cuenta.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const MAX_FALLOS = 5;
const VENTANA_MIN = 15;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    let body: any = {};
    try { body = await req.json(); } catch (_e) { /* sin cuerpo */ }
    const accion = String(body?.accion || "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u, error: uerr } = await admin.auth.getUser(jwt);
    if (uerr || !u?.user) return resp({ error: "sesion" }, 401);
    const yo = u.user;
    if (yo.user_metadata?.rol === "cliente") return resp({ error: "permiso" }, 403);

    if (accion === "estado") {
      const { data: a } = await admin.from("snte_asesores").select("nombre, activo").eq("user_id", yo.id).maybeSingle();
      return resp({ vinculado: !!(a && a.activo), nombre: a?.nombre || null });
    }

    if (accion === "entrar") {
      const correo = String(body?.correo || "").trim().toLowerCase();
      const clave = String(body?.clave || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo) || !/^[0-9A-Za-z]{3,20}$/.test(clave)) {
        return resp({ error: "datos_invalidos" }, 400);
      }

      const desde = new Date(Date.now() - VENTANA_MIN * 60 * 1000).toISOString();
      const { count } = await admin.from("snte_intentos").select("id", { count: "exact", head: true })
        .eq("user_id", yo.id).eq("ok", false).gte("created_at", desde);
      if ((count || 0) >= MAX_FALLOS) return resp({ error: "bloqueado", minutos: VENTANA_MIN }, 429);

      const { data: a } = await admin.from("snte_asesores").select("id, nombre, clave, activo").eq("correo", correo).maybeSingle();
      const ok = !!a && a.activo && a.clave === clave;
      await admin.from("snte_intentos").insert({ user_id: yo.id, ok });
      if (!ok) return resp({ error: "credenciales", restantes: Math.max(0, MAX_FALLOS - (count || 0) - 1) }, 401);

      // Una cuenta del CRM queda ligada a un solo asesor
      await admin.from("snte_asesores").update({ user_id: null }).eq("user_id", yo.id).neq("id", a!.id);
      const { error } = await admin.from("snte_asesores")
        .update({ user_id: yo.id, vinculado_en: new Date().toISOString() }).eq("id", a!.id);
      if (error) return resp({ error: "error", detalle: error.message }, 500);
      return resp({ ok: true, nombre: a!.nombre });
    }

    return resp({ error: "accion" }, 400);
  } catch (e) {
    return resp({ error: "error", detalle: String((e as Error)?.message || e) }, 500);
  }
});
