import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSubscriptionRequest {
  plan: "weekly" | "monthly";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[MP-CREATE-SUBSCRIPTION] Function started");

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
    }

    // Get plan IDs from secrets
    const weeklyPlanId = Deno.env.get("MP_WEEKLY_PLAN_ID");
    const monthlyPlanId = Deno.env.get("MP_MONTHLY_PLAN_ID");

    if (!weeklyPlanId || !monthlyPlanId) {
      throw new Error("MercadoPago plan IDs are not configured");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError) {
      throw new Error(`Auth error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    // Parse request body
    const { plan }: CreateSubscriptionRequest = await req.json();

    if (!plan || (plan !== "weekly" && plan !== "monthly")) {
      throw new Error("Invalid plan. Must be 'weekly' or 'monthly'");
    }

    console.log("[MP-CREATE-SUBSCRIPTION] Creating subscription for user:", user.id, "plan:", plan);

    // Get the plan ID and price based on selection
    const planId = plan === "weekly" ? weeklyPlanId : monthlyPlanId;
    const price = plan === "weekly" ? 7500 : 25000;

    // Calculate subscription period (first period)
    const now = new Date();
    const periodStart = now.toISOString();
    const daysToAdd = plan === "weekly" ? 7 : 30;
    const periodEnd = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    // Create subscription WITH plan association
    // This allows any MercadoPago account to pay (no email validation)
    const userEmail = user.email || "noreply@kitchen-ai.com";

    const subscription = {
      preapproval_plan_id: planId,
      payer_email: userEmail,
      external_reference: user.id,
      back_url: "https://kitchen-ai-companion.vercel.app/profile/subscription",
    };

    console.log("[MP-CREATE-SUBSCRIPTION] Request body:", JSON.stringify(subscription));
    console.log("[MP-CREATE-SUBSCRIPTION] Calling Mercado Pago Preapproval API with plan...");

    // Call Mercado Pago API to create subscription with plan
    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("[MP-CREATE-SUBSCRIPTION] Mercado Pago API error:", errorText);
      throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorText}`);
    }

    const mpData = await mpResponse.json();
    const subscriptionId = mpData.id;
    const initPoint = mpData.init_point;

    console.log("[MP-CREATE-SUBSCRIPTION] Subscription created:", subscriptionId);

    // Save subscription to database
    const { error: upsertError } = await supabaseClient
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        payment_gateway: "mercadopago",
        mercadopago_subscription_id: subscriptionId,
        mercadopago_plan_id: planId,
        plan: plan,
        status: "pending",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        is_recurring: true,
        subscribed: false,
        expiration_notified: false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("[MP-CREATE-SUBSCRIPTION] Error saving to database:", upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }

    console.log("[MP-CREATE-SUBSCRIPTION] Saved to database");

    const frequency = plan === "weekly" ? 7 : 1;
    const frequencyType = plan === "weekly" ? "days" : "months";

    return new Response(
      JSON.stringify({
        subscription_id: subscriptionId,
        init_point: initPoint,
        plan: plan,
        amount: price,
        currency: "ARS",
        frequency: `${frequency} ${frequencyType}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[MP-CREATE-SUBSCRIPTION] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
