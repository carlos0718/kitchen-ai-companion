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

    // Fetch current MEP exchange rate
    console.log("[MP-CREATE-SUBSCRIPTION] Fetching exchange rate...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const exchangeRateResponse = await fetch(`${supabaseUrl}/functions/v1/get-exchange-rate`);

    if (!exchangeRateResponse.ok) {
      throw new Error("Failed to fetch exchange rate");
    }

    const exchangeData = await exchangeRateResponse.json();
    const exchangeRate = exchangeData.rate;

    if (!exchangeRate || typeof exchangeRate !== "number") {
      throw new Error("Invalid exchange rate received");
    }

    console.log("[MP-CREATE-SUBSCRIPTION] Exchange rate:", exchangeRate);

    // Calculate dynamic pricing based on USD prices × MEP rate
    const weeklyPrice = Math.round(4.99 * exchangeRate);
    const monthlyPrice = Math.round(14.99 * exchangeRate);

    console.log("[MP-CREATE-SUBSCRIPTION] Calculated prices - Weekly:", weeklyPrice, "Monthly:", monthlyPrice);

    const price = plan === "weekly" ? weeklyPrice : monthlyPrice;
    const frequency = plan === "weekly" ? 7 : 1;
    const frequencyType = plan === "weekly" ? "days" : "months";

    // Calculate subscription period (first period)
    const now = new Date();
    const periodStart = now.toISOString();
    const daysToAdd = plan === "weekly" ? 7 : 30;
    const periodEnd = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    // Create subscription using Mercado Pago Preapproval API
    // payer_email is required by MP API but only for notifications
    // Users can still pay with any MercadoPago account
    const userEmail = user.email || "noreply@kitchen-ai.com";

    const subscription = {
      payer_email: userEmail,
      reason: plan === "weekly" ? "Plan Semanal - Kitchen AI" : "Plan Mensual - Kitchen AI",
      auto_recurring: {
        frequency: frequency,
        frequency_type: frequencyType,
        transaction_amount: price,
        currency_id: "ARS",
      },
      back_url: "https://kitchen-ai-companion.vercel.app/profile/subscription",
      external_reference: user.id,
    };

    console.log("[MP-CREATE-SUBSCRIPTION] Request body:", JSON.stringify(subscription));

    console.log("[MP-CREATE-SUBSCRIPTION] Calling Mercado Pago Preapproval API...");

    // Call Mercado Pago API to create subscription
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
        plan: plan,
        status: "pending",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        is_recurring: true, // Suscripción recurrente
        subscribed: false, // Se activará cuando el primer pago sea exitoso
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
