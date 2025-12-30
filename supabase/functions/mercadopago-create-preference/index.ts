import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePreferenceRequest {
  plan: "weekly" | "monthly";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[MP-CREATE-PREFERENCE] Function started");

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
    const { plan }: CreatePreferenceRequest = await req.json();

    if (!plan || (plan !== "weekly" && plan !== "monthly")) {
      throw new Error("Invalid plan. Must be 'weekly' or 'monthly'");
    }

    console.log("[MP-CREATE-PREFERENCE] Creating preference for user:", user.id, "plan:", plan);

    // Fetch current MEP exchange rate
    console.log("[MP-CREATE-PREFERENCE] Fetching exchange rate...");
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

    console.log("[MP-CREATE-PREFERENCE] Exchange rate:", exchangeRate);

    // Calculate dynamic pricing based on USD prices × MEP rate
    const weeklyPrice = Math.round(4.99 * exchangeRate);
    const monthlyPrice = Math.round(14.99 * exchangeRate);

    console.log("[MP-CREATE-PREFERENCE] Calculated prices - Weekly:", weeklyPrice, "Monthly:", monthlyPrice);

    const price = plan === "weekly" ? weeklyPrice : monthlyPrice;
    const daysToAdd = plan === "weekly" ? 7 : 30;

    // Calculate subscription period
    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    // Get user email
    const userEmail = user.email || "noreply@kitchen-ai.com";

    // Create preference object for Mercado Pago API
    const preference = {
      items: [
        {
          title: plan === "weekly" ? "Suscripción Semanal - Kitchen AI" : "Suscripción Mensual - Kitchen AI",
          description: `Plan ${plan === "weekly" ? "semanal" : "mensual"} de Kitchen AI Companion`,
          quantity: 1,
          unit_price: price,
          currency_id: "ARS",
        },
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "supabase.co")}/profile/subscription`,
        failure: `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "supabase.co")}/pricing`,
        pending: `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "supabase.co")}/profile/subscription`,
      },
      auto_return: "approved" as const,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      external_reference: user.id,
      metadata: {
        user_id: user.id,
        plan: plan,
        period_start: periodStart,
        period_end: periodEnd,
      },
      statement_descriptor: "Kitchen AI",
    };

    console.log("[MP-CREATE-PREFERENCE] Calling Mercado Pago API...");

    // Call Mercado Pago API to create preference
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("[MP-CREATE-PREFERENCE] Mercado Pago API error:", errorText);
      throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorText}`);
    }

    const mpData = await mpResponse.json();
    const preferenceId = mpData.id;
    const initPoint = mpData.init_point;

    console.log("[MP-CREATE-PREFERENCE] Preference created:", preferenceId);

    // Save preference to database (create or update subscription record)
    const { error: upsertError } = await supabaseClient
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        payment_gateway: "mercadopago",
        mercadopago_preference_id: preferenceId,
        plan: plan,
        status: "pending",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        is_recurring: false,
        expiration_notified: false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("[MP-CREATE-PREFERENCE] Error saving to database:", upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }

    console.log("[MP-CREATE-PREFERENCE] Saved to database");

    return new Response(
      JSON.stringify({
        preference_id: preferenceId,
        init_point: initPoint,
        plan: plan,
        amount: price,
        currency: "ARS",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[MP-CREATE-PREFERENCE] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
