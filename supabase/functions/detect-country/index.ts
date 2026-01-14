import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CountryDetectionResult {
  country: string;
  gateway: "stripe" | "mercadopago";
  currency: "USD" | "ARS";
  source: "ip_detection" | "user_profile" | "default";
  exchangeRate?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 🔧 CONFIGURATION: Use only Mercado Pago for all countries
  // Stripe is disabled until we can activate a Stripe account
  const USE_ONLY_MERCADOPAGO = true;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[DETECT-COUNTRY] Function started");
    if (USE_ONLY_MERCADOPAGO) {
      console.log("[DETECT-COUNTRY] 🔧 Using only Mercado Pago (Stripe disabled)");
    }

    // Try to authenticate user (optional - for saving preferences)
    let user = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

      if (!userError && userData?.user?.id) {
        user = userData.user;
        console.log("[DETECT-COUNTRY] Detecting country for user:", user.id);
      } else {
        console.log("[DETECT-COUNTRY] No valid user session, proceeding as anonymous");
      }
    } else {
      console.log("[DETECT-COUNTRY] No authorization header, proceeding as anonymous");
    }

    // Initialize result
    let result: CountryDetectionResult = {
      country: "US",
      gateway: "stripe",
      currency: "USD",
      source: "default",
    };

    // 🔧 CONFIGURATION: Force Mercado Pago for all countries
    if (USE_ONLY_MERCADOPAGO) {
      result = {
        country: "AR",
        gateway: "mercadopago",
        currency: "ARS",
        source: "ip_detection",
      };
      console.log("[DETECT-COUNTRY] Forcing Mercado Pago for all users");

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

      console.log("[DETECT-COUNTRY] Result (Mercado Pago only):", result);

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 1. Check if user already has a saved preference (only if authenticated)
    if (user?.id) {
      const { data: profile } = await supabaseClient
        .from("user_profiles")
        .select("preferred_gateway, preferred_currency")
        .eq("user_id", user.id)
        .single();

      if (profile?.preferred_gateway && profile?.preferred_currency) {
        console.log("[DETECT-COUNTRY] Using saved user preference");
        result = {
          country: profile.preferred_currency === "ARS" ? "AR" : "US",
          gateway: profile.preferred_gateway as "stripe" | "mercadopago",
          currency: profile.preferred_currency as "USD" | "ARS",
          source: "user_profile",
        };
      }
    }

    // 2. If no saved preference, detect from IP
    if (result.source === "default") {
      // 2. Detect from Cloudflare header (IP-based geolocation)
      const cfCountry = req.headers.get("CF-IPCountry");
      console.log("[DETECT-COUNTRY] CF-IPCountry header:", cfCountry);

      if (cfCountry) {
        const country = cfCountry.toUpperCase();

        // Map country to gateway and currency
        if (country === "AR") {
          result = {
            country: "AR",
            gateway: "mercadopago",
            currency: "ARS",
            source: "ip_detection",
          };
        } else {
          result = {
            country: country,
            gateway: "stripe",
            currency: "USD",
            source: "ip_detection",
          };
        }

        // Save preference to user profile for future requests (only if authenticated)
        if (user?.id) {
          const { error: updateError } = await supabaseClient
            .from("user_profiles")
            .upsert({
              user_id: user.id,
              preferred_gateway: result.gateway,
              preferred_currency: result.currency,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "user_id",
              ignoreDuplicates: false,
            });

          if (updateError) {
            console.error("[DETECT-COUNTRY] Error saving preference:", updateError);
            // Don't fail the request, just log the error
          } else {
            console.log("[DETECT-COUNTRY] Saved preference to user profile");
          }
        } else {
          console.log("[DETECT-COUNTRY] Skipping preference save (no user session)");
        }
      }
    }

    // If Argentina, fetch exchange rate
    if (result.currency === "ARS") {
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
        // Continue without exchange rate - frontend will handle
      }
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

    // Return default values on error (international/Stripe)
    return new Response(
      JSON.stringify({
        country: "US",
        gateway: "stripe",
        currency: "USD",
        source: "default",
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 to not break the flow
      }
    );
  }
});
