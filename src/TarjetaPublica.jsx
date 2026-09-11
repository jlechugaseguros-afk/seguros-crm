import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { TARJETA_PLANTILLAS, TARJETA_POS, LINK_UBICACION } from "./tarjetaAssets.js";

export default function TarjetaPublica({ agentId }) {
  const [data, setData] = useState(undefined); // undefined = cargando, null = no encontrada
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from("public_cards")
          .select("*")
          .eq("agent_id", agentId)
          .maybeSingle();
        if (error) throw error;
        setData(row || null);
      } catch (e) {
        setError(e.message);
        setData(null);
      }
    })();
  }, [agentId]);

  if (data === undefined) {
    return <div style={{ minHeight: "100vh", background: "#F7F5F0" }} />;
  }

  if (!data) {
    return (
      <div style={{
        minHeight: "100vh", background: "#F7F5F0", display: "flex", alignItems: "center",
        justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: 20, textAlign: "center",
      }}>
        <div>
          <p style={{ fontSize: 16, color: "#1B2A41", fontWeight: 600 }}>Esta tarjeta no está disponible.</p>
          {error && <p style={{ fontSize: 12, color: "#B0AB9A" }}>{error}</p>}
        </div>
      </div>
    );
  }

  const plantilla = TARJETA_PLANTILLAS[data.plantilla_id] || TARJETA_PLANTILLAS.qualitas;
  const linkWhatsapp = data.whatsapp ? `https://wa.me/${String(data.whatsapp).replace(/\D/g, "")}` : "";
  const linkCorreo = data.correo ? `mailto:${data.correo}` : "";
  const linkTelefono = data.telefono ? `tel:${String(data.telefono).replace(/\s/g, "")}` : "";

  return (
    <div style={{
      minHeight: "100vh", background: "#F7F5F0", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: 320, maxWidth: "100%", position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.18)", aspectRatio: "1080 / 1920" }}>
        <img src={plantilla.bg} alt={plantilla.nombre} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />

        {data.foto_url && (
          <div style={{ position: "absolute", overflow: "hidden", borderRadius: "50%", border: "3px solid #fff", ...TARJETA_POS.foto }}>
            <img src={data.foto_url} alt={data.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{
          position: "absolute", width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 16px", top: TARJETA_POS.nombre.top, height: TARJETA_POS.nombre.height,
        }}>
          <span style={{ fontWeight: 800, fontSize: 15, textAlign: "center", color: plantilla.colorNombre }}>
            {data.nombre}
          </span>
        </div>

        <a href={LINK_UBICACION} target="_blank" rel="noreferrer" style={{ position: "absolute", borderRadius: "50%", ...TARJETA_POS.iconoUbicacion }} />
        {linkCorreo && <a href={linkCorreo} style={{ position: "absolute", borderRadius: "50%", ...TARJETA_POS.iconoCorreo }} />}
        {linkTelefono && <a href={linkTelefono} style={{ position: "absolute", borderRadius: "50%", ...TARJETA_POS.iconoTelefono }} />}
        {linkWhatsapp && (
          <>
            <a href={linkWhatsapp} style={{ position: "absolute", ...TARJETA_POS.cotizarBtn }} />
            <a href={linkWhatsapp} style={{ position: "absolute", borderRadius: "50%", ...TARJETA_POS.whatsappBubble }} />
          </>
        )}
      </div>
    </div>
  );
}
