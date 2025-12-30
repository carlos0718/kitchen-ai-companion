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
    console.log("[NOTIFY-EXPIRING] Cron job started");

    // Verify cron secret for security
    const cronSecret = req.headers.get("Authorization")?.replace("Bearer ", "");
    const expectedSecret = Deno.env.get("CRON_SECRET");

    if (!expectedSecret || cronSecret !== expectedSecret) {
      console.error("[NOTIFY-EXPIRING] Unauthorized request");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Calculate date 2 days from now
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysFromNowStr = twoDaysFromNow.toISOString();

    // Calculate date 1 day from now (start of the 48-hour window)
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    const oneDayFromNowStr = oneDayFromNow.toISOString();

    console.log("[NOTIFY-EXPIRING] Looking for subscriptions expiring between:", oneDayFromNowStr, "and", twoDaysFromNowStr);

    // Find Mercado Pago subscriptions expiring in ~2 days that haven't been notified
    const { data: expiringSubscriptions, error: fetchError } = await supabaseClient
      .from("user_subscriptions")
      .select("user_id, plan, current_period_end")
      .eq("payment_gateway", "mercadopago")
      .eq("status", "active")
      .eq("expiration_notified", false)
      .gte("current_period_end", oneDayFromNowStr)
      .lte("current_period_end", twoDaysFromNowStr);

    if (fetchError) {
      console.error("[NOTIFY-EXPIRING] Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      console.log("[NOTIFY-EXPIRING] No expiring subscriptions found");
      return new Response(
        JSON.stringify({ notified_count: 0, message: "No subscriptions expiring soon" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`[NOTIFY-EXPIRING] Found ${expiringSubscriptions.length} expiring subscriptions`);

    let notifiedCount = 0;
    let errors = [];

    // Process each expiring subscription
    for (const subscription of expiringSubscriptions) {
      try {
        // Calculate days until expiration
        const now = new Date();
        const expirationDate = new Date(subscription.current_period_end);
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        console.log(`[NOTIFY-EXPIRING] Notifying user ${subscription.user_id} - expires in ${daysUntilExpiration} days`);

        // Create notification
        const { error: notifError } = await supabaseClient
          .from("user_notifications")
          .insert({
            user_id: subscription.user_id,
            title: "Tu suscripción está por vencer",
            message: daysUntilExpiration === 1
              ? `Tu plan ${subscription.plan === "weekly" ? "semanal" : "mensual"} vence mañana. Renueva ahora para no perder acceso a las funcionalidades premium.`
              : `Tu plan ${subscription.plan === "weekly" ? "semanal" : "mensual"} vence en ${daysUntilExpiration} días. Recuerda renovar para continuar disfrutando de los beneficios.`,
            type: "warning",
            related_entity: "subscription",
            created_at: new Date().toISOString(),
          });

        if (notifError) {
          console.error("[NOTIFY-EXPIRING] Error creating notification:", notifError);
          errors.push({ user_id: subscription.user_id, error: notifError.message });
          continue;
        }

        // Mark as notified
        const { error: updateError } = await supabaseClient
          .from("user_subscriptions")
          .update({
            expiration_notified: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", subscription.user_id);

        if (updateError) {
          console.error("[NOTIFY-EXPIRING] Error updating notification flag:", updateError);
          errors.push({ user_id: subscription.user_id, error: updateError.message });
          continue;
        }

        notifiedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[NOTIFY-EXPIRING] Error processing user ${subscription.user_id}:`, errorMessage);
        errors.push({ user_id: subscription.user_id, error: errorMessage });
      }
    }

    console.log(`[NOTIFY-EXPIRING] Successfully notified ${notifiedCount} users`);

    return new Response(
      JSON.stringify({
        notified_count: notifiedCount,
        total_found: expiringSubscriptions.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[NOTIFY-EXPIRING] Fatal error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
