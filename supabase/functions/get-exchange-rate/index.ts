import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache for exchange rate (5 minutes TTL)
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[GET-EXCHANGE-RATE] Function started");

    // Check cache first
    const now = Date.now();
    if (cachedRate && (now - cachedRate.timestamp) < CACHE_TTL) {
      console.log("[GET-EXCHANGE-RATE] Returning cached rate:", cachedRate.rate);
      return new Response(
        JSON.stringify({
          rate: cachedRate.rate,
          source: "cache",
          timestamp: new Date(cachedRate.timestamp).toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Fetch fresh rate from DolarAPI (MEP - Mercado Electrónico de Pagos)
    console.log("[GET-EXCHANGE-RATE] Fetching fresh rate from DolarAPI");
    const response = await fetch("https://dolarapi.com/v1/dolares/bolsa");

    if (!response.ok) {
      throw new Error(`DolarAPI error: ${response.status}`);
    }

    const data = await response.json();

    // DolarAPI returns: { "compra": 1050.00, "venta": 1070.00, ... }
    // We use the "venta" (sell) price for conversions
    const rate = data.venta;

    if (!rate || typeof rate !== "number") {
      throw new Error("Invalid rate received from API");
    }

    console.log("[GET-EXCHANGE-RATE] Fresh rate fetched:", rate);

    // Update cache
    cachedRate = {
      rate: rate,
      timestamp: now,
    };

    return new Response(
      JSON.stringify({
        rate: rate,
        source: "api",
        timestamp: new Date(now).toISOString(),
        compra: data.compra,
        venta: data.venta,
        fechaActualizacion: data.fechaActualizacion,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[GET-EXCHANGE-RATE] Error:", errorMessage);

    // Return fallback rate if API fails (last known MEP rate as backup)
    const fallbackRate = 1200; // Update this periodically as a safe fallback
    console.log("[GET-EXCHANGE-RATE] Using fallback rate:", fallbackRate);

    return new Response(
      JSON.stringify({
        rate: fallbackRate,
        source: "fallback",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
