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

    const { code, plan } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Código requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Re-validate (idempotent)
    const { data: promoCode } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", normalizedCode)
      .single();

    if (!promoCode || !promoCode.is_active) {
      return new Response(JSON.stringify({ error: "Código inválido o no disponible" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Este código ha expirado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingUse } = await supabase
      .from("promo_code_uses")
      .select("id")
      .eq("promo_code_id", promoCode.id)
      .eq("user_id", user.id)
      .single();

    if (existingUse) {
      return new Response(JSON.stringify({ error: "Ya usaste este cupón anteriormente" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomically increment uses (prevents race condition on last slot)
    const { data: updatedCode } = await supabase
      .from("promo_codes")
      .update({ current_uses: promoCode.current_uses + 1 })
      .eq("id", promoCode.id)
      .lt("current_uses", promoCode.max_uses)
      .select("id")
      .single();

    if (!updatedCode) {
      return new Response(JSON.stringify({ error: "Este código ya alcanzó su límite de usos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record the use
    const grantedPlan = promoCode.applicable_plan || plan || "weekly";
    const grantedDays = promoCode.type === "free_trial" ? promoCode.value : null;

    await supabase.from("promo_code_uses").insert({
      promo_code_id: promoCode.id,
      user_id: user.id,
      granted_plan: grantedPlan,
      granted_days: grantedDays,
    });

    // Handle free_trial: create a manual active subscription
    if (promoCode.type === "free_trial") {
      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("status, subscribed")
        .eq("user_id", user.id)
        .single();

      if (existingSub?.status === "active" && existingSub?.subscribed) {
        return new Response(JSON.stringify({ error: "Ya tenés una suscripción activa" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If first_time_only: reject users who ever had a subscription
      if (promoCode.first_time_only && existingSub) {
        return new Response(JSON.stringify({ error: "Este cupón es exclusivo para usuarios nuevos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const periodEnd = new Date(now.getTime() + promoCode.value * 24 * 60 * 60 * 1000);

      await supabase.from("user_subscriptions").upsert({
        user_id: user.id,
        plan: grantedPlan,
        status: "active",
        subscribed: true,
        payment_gateway: "manual",
        is_recurring: false,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        expiration_notified: false,
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

      // Notify user
      await supabase.from("user_notifications").insert({
        user_id: user.id,
        type: "promo_applied",
        title: "¡Cupón activado!",
        message: `Tenés ${promoCode.value} días gratis de Premium activados. ¡Disfrutá todas las funcionalidades!`,
        severity: "success",
        read: false,
        action_url: "/chat",
      });

      return new Response(JSON.stringify({
        success: true,
        type: "free_trial",
        days_granted: promoCode.value,
        plan: grantedPlan,
        period_end: periodEnd.toISOString(),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // discount_percent: just confirm — the discount is applied in the MP checkout
    return new Response(JSON.stringify({
      success: true,
      type: "discount_percent",
      discount_percent: promoCode.value,
      plan: grantedPlan,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("apply-promo-code error:", error);
    return new Response(JSON.stringify({ error: "Error interno al aplicar el cupón" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
