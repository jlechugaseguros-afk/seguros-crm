import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Retirada: el portal ya no usa enlaces por correo; el acceso es con contraseña (portal-activar).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
});
