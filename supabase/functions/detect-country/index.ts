import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CountryDetectionResult {
  country: string;
  gateway: "stripe" | "mercadopago" | null;
  currency: "USD" | "ARS";
  source: "ip_detection" | "default";
  exchangeRate?: number;
  available: boolean; // Whether payment is available in this country
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 🔧 CONFIGURATION: MercadoPago only available in Argentina
  // Other countries will see "not available" message
  const ARGENTINA_ONLY = true;

  try {
    console.log("[DETECT-COUNTRY] Function started");
    console.log("[DETECT-COUNTRY] Argentina-only mode:", ARGENTINA_ONLY);

    // Detect country from Cloudflare header (IP-based geolocation)
    const cfCountry = req.headers.get("CF-IPCountry");
    console.log("[DETECT-COUNTRY] CF-IPCountry header:", cfCountry);

    let detectedCountry = cfCountry ? cfCountry.toUpperCase() : null;

    // Get client's real IP from headers
    const clientIP = req.headers.get("CF-Connecting-IP")
      || req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()
      || req.headers.get("X-Real-IP");

    console.log("[DETECT-COUNTRY] Client IP from headers:", clientIP);

    // Fallback: Use ipapi.co if Cloudflare header is not available
    if (!detectedCountry && clientIP) {
      console.log("[DETECT-COUNTRY] No CF-IPCountry header, using ipapi.co with client IP:", clientIP);
      try {
        const ipApiResponse = await fetch(`https://ipapi.co/${clientIP}/json/`, {
          headers: { "User-Agent": "kitchen-ai-companion" },
        });
        if (ipApiResponse.ok) {
          const ipData = await ipApiResponse.json();
          if (ipData.error) {
            console.log("[DETECT-COUNTRY] ipapi.co error response:", ipData.reason);
            detectedCountry = "AR"; // Default to AR if IP lookup fails
          } else {
            detectedCountry = ipData.country_code?.toUpperCase() || "AR";
            console.log("[DETECT-COUNTRY] ipapi.co detected:", detectedCountry, "city:", ipData.city);
          }
        } else {
          console.log("[DETECT-COUNTRY] ipapi.co failed, defaulting to AR");
          detectedCountry = "AR";
        }
      } catch (ipError) {
        console.error("[DETECT-COUNTRY] ipapi.co error:", ipError);
        detectedCountry = "AR";
      }
    } else if (!detectedCountry) {
      // No CF header and no client IP - default to AR for best user experience
      console.log("[DETECT-COUNTRY] No detection method available, defaulting to AR");
      detectedCountry = "AR";
    }

    const isArgentina = detectedCountry === "AR";

    // Initialize result based on country
    let result: CountryDetectionResult;

    if (isArgentina) {
      // Argentina: Full MercadoPago support
      result = {
        country: "AR",
        gateway: "mercadopago",
        currency: "ARS",
        source: "ip_detection",
        available: true,
      };
      console.log("[DETECT-COUNTRY] Argentine user detected - MercadoPago available");

      // Fetch exchange rate for ARS pricing
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const exchangeRateResponse = await fetch(`${supabaseUrl}/functions/v1/get-exchange-rate`);

        if (exchangeRateResponse.ok) {
          const exchangeData = await exchangeRateResponse.json();
          result.exchangeRate = exchangeData.rate;
          console.log("[DETECT-COUNTRY] Exchange rate fetched:", result.exchangeRate);
        }
      } catch (error) {
        console.error("[DETECT-COUNTRY] Error fetching exchange rate:", error);
      }
    } else {
      // Other countries: Payment not available yet
      result = {
        country: detectedCountry,
        gateway: null,
        currency: "USD",
        source: "ip_detection",
        available: false,
      };
      console.log("[DETECT-COUNTRY] Non-Argentine user detected - Payment not available");
    }

    console.log("[DETECT-COUNTRY] Result:", result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[DETECT-COUNTRY] Error:", errorMessage);

    // Return default values on error - assume Argentina for best experience
    return new Response(
      JSON.stringify({
        country: "AR",
        gateway: "mercadopago",
        currency: "ARS",
        source: "default",
        available: true,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
