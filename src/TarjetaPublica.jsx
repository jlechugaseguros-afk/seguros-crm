import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { TarjetaVista } from "./TarjetaMC.jsx";

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
    return <div className="min-h-dvh" style={{ background: "#F7F5F0" }} />;
  }

  if (!data) {
    return (
      <div className="min-h-dvh" style={{
        background: "#F7F5F0", display: "flex", alignItems: "center",
        justifyContent: "center", fontFamily: "'Manrope', system-ui, sans-serif", padding: 20, textAlign: "center",
      }}>
        <div>
          <p style={{ fontSize: 16, color: "#1B2A41", fontWeight: 600 }}>Esta tarjeta no está disponible.</p>
          {error && <p style={{ fontSize: 12, color: "#B0AB9A" }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{
      background: "#F7F5F0", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 20, fontFamily: "'Manrope', system-ui, sans-serif",
    }}>
      <div style={{ width: 340, maxWidth: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.18)", borderRadius: 20 }}>
        <TarjetaVista
          nombre={data.nombre}
          fotoUrl={data.foto_url}
          whatsapp={data.whatsapp}
          correo={data.correo}
          web={data.web}
          qrUrl={data.qr_url}
          catalogo={data.catalogo_url}
        />
      </div>
    </div>
  );
}
