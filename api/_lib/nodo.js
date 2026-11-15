// Adaptador: convierte un manejador estilo Web (Request -> Response) al formato de funciones Node de Vercel.
export function aNode(manejar) {
  return async function handler(req, res) {
    try {
      const r = await manejar(new Request("https://crm.local" + req.url));
      res.statusCode = r.status;
      r.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      console.error("Error en la función:", e);
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("No se pudo generar el contenido.");
    }
  };
}
