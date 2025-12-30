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
    console.log("[MP-CHECK-PAYMENT] Function started");

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

    console.log("[MP-CHECK-PAYMENT] Checking payment for user:", user.id);

    // Get subscription from database
    const { data: subscription, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (subError) {
      // No subscription found - return free plan
      console.log("[MP-CHECK-PAYMENT] No subscription found");
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan: "free",
          status: null,
          payment_gateway: null,
          is_recurring: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check if subscription has expired (only for Mercado Pago non-recurring)
    if (
      subscription.payment_gateway === "mercadopago" &&
      subscription.is_recurring === false &&
      subscription.status === "active"
    ) {
      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);

      if (periodEnd < now) {
        console.log("[MP-CHECK-PAYMENT] Subscription expired - auto-expiring");

        // Auto-expire subscription
        const { error: expireError } = await supabaseClient
          .from("user_subscriptions")
          .update({
            status: "canceled",
            plan: "free",
            subscribed: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (expireError) {
          console.error("[MP-CHECK-PAYMENT] Error expiring subscription:", expireError);
        } else {
          // Create notification
          await supabaseClient
            .from("user_notifications")
            .insert({
              user_id: user.id,
              title: "Suscripción expirada",
              message: "Tu suscripción ha expirado. Renueva para continuar disfrutando de los beneficios premium.",
              type: "warning",
              related_entity: "subscription",
              created_at: new Date().toISOString(),
            });

          // Return expired status
          return new Response(
            JSON.stringify({
              subscribed: false,
              plan: "free",
              status: "expired",
              payment_gateway: "mercadopago",
              is_recurring: false,
              expired_at: subscription.current_period_end,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
    }

    // Calculate days until expiration for non-recurring subscriptions
    let daysUntilExpiration: number | null = null;
    if (subscription.is_recurring === false && subscription.current_period_end) {
      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);
      const diffTime = periodEnd.getTime() - now.getTime();
      daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Return current subscription status
    return new Response(
      JSON.stringify({
        subscribed: subscription.subscribed || subscription.status === "active",
        plan: subscription.plan,
        status: subscription.status,
        payment_gateway: subscription.payment_gateway,
        is_recurring: subscription.is_recurring,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        mercadopago_payment_id: subscription.mercadopago_payment_id,
        mercadopago_preference_id: subscription.mercadopago_preference_id,
        days_until_expiration: daysUntilExpiration,
        expiration_notified: subscription.expiration_notified,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[MP-CHECK-PAYMENT] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
