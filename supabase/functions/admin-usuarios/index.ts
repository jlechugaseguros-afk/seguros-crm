import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Administración de usuarios del CRM (solo rol "admin").
//  - listar:      agentes del CRM con su estado (excluye clientes del portal)
//  - crear:       alta de un agente con contraseña temporal de 6 dígitos (debe cambiarla al entrar)
//  - restablecer: nueva contraseña temporal de 6 dígitos para un agente
//  - suspender / reactivar: bloquea o devuelve el acceso
//  - permisos:    define qué pestañas puede ver un agente y su letra distintiva de perfil
//  - clave_cambiada: cualquier usuario autenticado avisa que ya puso su contraseña personal
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

const codigo6 = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
const BAN_LARGO = "876000h"; // ~100 años

// Pestañas: lista de ids (null = todas) y letra A-Z del perfil de acceso.
function limpiarAccesos(body: any): { pestanas: string[] | null; letra: string | null } | null {
  const p = body?.pestanas;
  const l = body?.letra;
  let pestanas: string[] | null = null;
  if (Array.isArray(p)) {
    pestanas = [...new Set(p.map((x: unknown) => String(x)).filter((x: string) => /^[a-zA-Z0-9_-]{1,40}$/.test(x)))].slice(0, 60);
    if (pestanas.length === 0) return null; // al menos una pestaña
  }
  const letra = typeof l === "string" && /^[A-Z]$/.test(l) ? l : null;
  return { pestanas, letra };
}

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

    // Cualquier usuario: marcar que ya cambió su contraseña temporal
    if (accion === "clave_cambiada") {
      await admin.from("perfiles").update({ debe_cambiar_clave: false }).eq("user_id", yo.id);
      return resp({ ok: true });
    }

    // Todo lo demás: solo administradores activos
    const { data: miPerfil } = await admin.from("perfiles").select("rol, activo").eq("user_id", yo.id).maybeSingle();
    if (!miPerfil || miPerfil.rol !== "admin" || !miPerfil.activo) return resp({ error: "permiso" }, 403);

    if (accion === "listar") {
      const usuarios: any[] = [];
      for (let page = 1; page <= 20; page++) {
        const { data: l, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) return resp({ error: "error", detalle: error.message }, 500);
        usuarios.push(...(l?.users || []));
        if (!l?.users || l.users.length < 1000) break;
      }
      const { data: perfiles } = await admin.from("perfiles").select("*");
      const porId = new Map((perfiles || []).map((p: any) => [p.user_id, p]));
      const lista = usuarios
        .filter((x) => x.user_metadata?.rol !== "cliente")
        .map((x) => {
          const p: any = porId.get(x.id);
          const proveedores: string[] = x.app_metadata?.providers || [];
          return {
            id: x.id,
            correo: x.email,
            nombre: p?.nombre || x.user_metadata?.full_name || x.user_metadata?.name || "",
            rol: p?.rol || (x.user_metadata?.rol === "demo" ? "demo" : "agente"),
            activo: p ? !!p.activo : true,
            debe_cambiar_clave: !!p?.debe_cambiar_clave,
            pestanas_permitidas: p?.pestanas_permitidas ?? null,
            perfil_letra: p?.perfil_letra ?? null,
            google: proveedores.includes("google"),
            ultimo_acceso: x.last_sign_in_at || null,
            creado: x.created_at,
            sin_perfil: !p,
          };
        })
        .sort((a, b) => String(a.creado).localeCompare(String(b.creado)));
      return resp({ usuarios: lista });
    }

    if (accion === "crear") {
      const correo = String(body?.correo || "").trim().toLowerCase();
      const nombre = String(body?.nombre || "").trim().slice(0, 120);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return resp({ error: "correo_invalido" }, 400);
      const accesos = limpiarAccesos(body);
      if (!accesos) return resp({ error: "accesos_invalidos" }, 400);
      const clave = codigo6();
      const { data: nuevo, error } = await admin.auth.admin.createUser({
        email: correo, password: clave, email_confirm: true,
        user_metadata: nombre ? { full_name: nombre } : {},
      });
      if (error || !nuevo?.user) {
        const msg = String(error?.message || "");
        if (/already|registered|exists/i.test(msg)) return resp({ error: "correo_existe" }, 409);
        return resp({ error: "error", detalle: msg }, 500);
      }
      const { error: perr } = await admin.from("perfiles").upsert({
        user_id: nuevo.user.id, rol: "agente", nombre: nombre || null, activo: true,
        debe_cambiar_clave: true, creado_por: yo.id,
        pestanas_permitidas: accesos.pestanas, perfil_letra: accesos.letra,
      }, { onConflict: "user_id" });
      if (perr) return resp({ error: "error", detalle: perr.message }, 500);
      return resp({ ok: true, id: nuevo.user.id, correo, clave });
    }

    // Acciones sobre un usuario existente
    const id = String(body?.id || "");
    if (!/^[0-9a-f-]{36}$/.test(id)) return resp({ error: "id_invalido" }, 400);
    if (id === yo.id) return resp({ error: "tu_cuenta" }, 400);
    const { data: objetivo, error: gerr } = await admin.auth.admin.getUserById(id);
    if (gerr || !objetivo?.user) return resp({ error: "no_existe" }, 404);
    if (objetivo.user.user_metadata?.rol === "cliente") return resp({ error: "es_cliente" }, 403);

    if (accion === "restablecer") {
      const clave = codigo6();
      const { error } = await admin.auth.admin.updateUserById(id, { password: clave, email_confirm: true });
      if (error) return resp({ error: "error", detalle: error.message }, 500);
      await admin.from("perfiles").upsert({ user_id: id, debe_cambiar_clave: true }, { onConflict: "user_id" });
      return resp({ ok: true, correo: objetivo.user.email, clave });
    }

    if (accion === "permisos") {
      const accesos = limpiarAccesos(body);
      if (!accesos) return resp({ error: "accesos_invalidos" }, 400);
      const { error } = await admin.from("perfiles").upsert({
        user_id: id, pestanas_permitidas: accesos.pestanas, perfil_letra: accesos.letra,
      }, { onConflict: "user_id" });
      if (error) return resp({ error: "error", detalle: error.message }, 500);
      return resp({ ok: true });
    }

    if (accion === "suspender") {
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: BAN_LARGO });
      if (error) return resp({ error: "error", detalle: error.message }, 500);
      await admin.from("perfiles").upsert({ user_id: id, activo: false }, { onConflict: "user_id" });
      return resp({ ok: true });
    }

    if (accion === "reactivar") {
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
      if (error) return resp({ error: "error", detalle: error.message }, 500);
      await admin.from("perfiles").upsert({ user_id: id, activo: true }, { onConflict: "user_id" });
      return resp({ ok: true });
    }

    return resp({ error: "accion" }, 400);
  } catch (e) {
    return resp({ error: "error", detalle: String(e) }, 500);
  }
});
