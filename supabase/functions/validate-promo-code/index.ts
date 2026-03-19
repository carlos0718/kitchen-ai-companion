import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Get user from JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ valid: false, error: "Código requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Fetch promo code
    const { data: promoCode, error: codeError } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", normalizedCode)
      .single();

    if (codeError || !promoCode) {
      return new Response(JSON.stringify({ valid: false, error: "Código inválido o no existe" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if active
    if (!promoCode.is_active) {
      return new Response(JSON.stringify({ valid: false, error: "Este código ya no está disponible" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: "Este código ha expirado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check uses
    if (promoCode.current_uses >= promoCode.max_uses) {
      return new Response(JSON.stringify({ valid: false, error: "Este código ya alcanzó su límite de usos" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already used it
    const { data: existingUse } = await supabase
      .from("promo_code_uses")
      .select("id")
      .eq("promo_code_id", promoCode.id)
      .eq("user_id", user.id)
      .single();

    if (existingUse) {
      return new Response(JSON.stringify({ valid: false, error: "Ya usaste este cupón anteriormente" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check first_time_only: reject if user ever had a subscription
    if (promoCode.first_time_only) {
      const { data: anySub } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (anySub) {
        return new Response(JSON.stringify({ valid: false, error: "Este cupón es exclusivo para usuarios nuevos" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({
      valid: true,
      code: normalizedCode,
      type: promoCode.type,
      value: promoCode.value,
      applicable_plan: promoCode.applicable_plan,
      description: promoCode.description,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("validate-promo-code error:", error);
    return new Response(JSON.stringify({ valid: false, error: "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
