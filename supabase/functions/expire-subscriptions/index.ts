import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log("[EXPIRE-SUBSCRIPTIONS] Cron job started");

    // Verify cron secret for security
    const cronSecret = req.headers.get("Authorization")?.replace("Bearer ", "");
    const expectedSecret = Deno.env.get("CRON_SECRET");

    if (!expectedSecret || cronSecret !== expectedSecret) {
      console.error("[EXPIRE-SUBSCRIPTIONS] Unauthorized request");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const now = new Date().toISOString();
    console.log("[EXPIRE-SUBSCRIPTIONS] Current time:", now);

    // Find all Mercado Pago subscriptions that have expired
    const { data: expiredSubscriptions, error: fetchError } = await supabaseClient
      .from("user_subscriptions")
      .select("user_id, plan, current_period_end")
      .eq("payment_gateway", "mercadopago")
      .eq("status", "active")
      .lt("current_period_end", now);

    if (fetchError) {
      console.error("[EXPIRE-SUBSCRIPTIONS] Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      console.log("[EXPIRE-SUBSCRIPTIONS] No expired subscriptions found");
      return new Response(
        JSON.stringify({ expired_count: 0, message: "No expired subscriptions" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`[EXPIRE-SUBSCRIPTIONS] Found ${expiredSubscriptions.length} expired subscriptions`);

    let expiredCount = 0;
    let errors = [];

    // Process each expired subscription
    for (const subscription of expiredSubscriptions) {
      try {
        console.log(`[EXPIRE-SUBSCRIPTIONS] Expiring subscription for user:`, subscription.user_id);

        // Update subscription to expired
        const { error: updateError } = await supabaseClient
          .from("user_subscriptions")
          .update({
            status: "canceled",
            plan: "free",
            subscribed: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", subscription.user_id);

        if (updateError) {
          console.error("[EXPIRE-SUBSCRIPTIONS] Error updating subscription:", updateError);
          errors.push({ user_id: subscription.user_id, error: updateError.message });
          continue;
        }

        // Create notification for user
        const { error: notifError } = await supabaseClient
          .from("user_notifications")
          .insert({
            user_id: subscription.user_id,
            title: "Suscripción expirada",
            message: `Tu plan ${subscription.plan === "weekly" ? "semanal" : "mensual"} ha expirado. Renueva tu suscripción para continuar disfrutando de los beneficios premium.`,
            type: "warning",
            related_entity: "subscription",
            created_at: new Date().toISOString(),
          });

        if (notifError) {
          console.error("[EXPIRE-SUBSCRIPTIONS] Error creating notification:", notifError);
          // Don't count as critical error
        }

        expiredCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[EXPIRE-SUBSCRIPTIONS] Error processing user ${subscription.user_id}:`, errorMessage);
        errors.push({ user_id: subscription.user_id, error: errorMessage });
      }
    }

    console.log(`[EXPIRE-SUBSCRIPTIONS] Successfully expired ${expiredCount} subscriptions`);

    return new Response(
      JSON.stringify({
        expired_count: expiredCount,
        total_found: expiredSubscriptions.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[EXPIRE-SUBSCRIPTIONS] Fatal error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
