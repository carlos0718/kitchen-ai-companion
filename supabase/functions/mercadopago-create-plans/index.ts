import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function creates the subscription plans in MercadoPago
// Run this ONCE to create the plans, then save the IDs as secrets
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[MP-CREATE-PLANS] Function started");

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
    }

    // Create Weekly Plan - $7,500 ARS every 7 days
    const weeklyPlan = {
      reason: "Plan Semanal - Kitchen AI",
      auto_recurring: {
        frequency: 7,
        frequency_type: "days",
        transaction_amount: 7500,
        currency_id: "ARS",
      },
      back_url: "https://kitchen-ai-companion.vercel.app/profile/subscription",
    };

    console.log("[MP-CREATE-PLANS] Creating weekly plan...");
    const weeklyResponse = await fetch("https://api.mercadopago.com/preapproval_plan", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(weeklyPlan),
    });

    if (!weeklyResponse.ok) {
      const errorText = await weeklyResponse.text();
      console.error("[MP-CREATE-PLANS] Error creating weekly plan:", errorText);
      throw new Error(`Error creating weekly plan: ${errorText}`);
    }

    const weeklyData = await weeklyResponse.json();
    console.log("[MP-CREATE-PLANS] Weekly plan created:", weeklyData.id);

    // Create Monthly Plan - $25,000 ARS every month
    const monthlyPlan = {
      reason: "Plan Mensual - Kitchen AI",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 25000,
        currency_id: "ARS",
      },
      back_url: "https://kitchen-ai-companion.vercel.app/profile/subscription",
    };

    console.log("[MP-CREATE-PLANS] Creating monthly plan...");
    const monthlyResponse = await fetch("https://api.mercadopago.com/preapproval_plan", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(monthlyPlan),
    });

    if (!monthlyResponse.ok) {
      const errorText = await monthlyResponse.text();
      console.error("[MP-CREATE-PLANS] Error creating monthly plan:", errorText);
      throw new Error(`Error creating monthly plan: ${errorText}`);
    }

    const monthlyData = await monthlyResponse.json();
    console.log("[MP-CREATE-PLANS] Monthly plan created:", monthlyData.id);

    // Return the plan IDs - SAVE THESE AS SECRETS!
    return new Response(
      JSON.stringify({
        message: "Plans created successfully! Save these IDs as Supabase secrets.",
        weekly_plan_id: weeklyData.id,
        monthly_plan_id: monthlyData.id,
        instructions: [
          "Run: npx supabase secrets set MP_WEEKLY_PLAN_ID=" + weeklyData.id,
          "Run: npx supabase secrets set MP_MONTHLY_PLAN_ID=" + monthlyData.id,
        ],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[MP-CREATE-PLANS] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
