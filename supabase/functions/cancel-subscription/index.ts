import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    console.log("[CANCEL-SUBSCRIPTION] Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    console.log("[CANCEL-SUBSCRIPTION] User authenticated:", user.id);

    // Get user's subscription from database
    const { data: dbSubscription, error: dbError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (dbError || !dbSubscription) {
      throw new Error("No subscription found for user");
    }

    // Handle Mercado Pago subscriptions
    if (dbSubscription.payment_gateway === 'mercadopago') {
      console.log("[CANCEL-SUBSCRIPTION] Canceling Mercado Pago subscription");

      const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (!mpAccessToken) {
        throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
      }

      // If there's a subscription ID, cancel it in Mercado Pago
      if (dbSubscription.mercadopago_subscription_id) {
        console.log("[CANCEL-SUBSCRIPTION] Canceling MP subscription:", dbSubscription.mercadopago_subscription_id);

        try {
          // Cancel subscription in Mercado Pago API
          const cancelResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${dbSubscription.mercadopago_subscription_id}`,
            {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${mpAccessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "cancelled",
              }),
            }
          );

          if (!cancelResponse.ok) {
            const errorText = await cancelResponse.text();
            console.error("[CANCEL-SUBSCRIPTION] MP API error:", errorText);
            throw new Error(`Failed to cancel MP subscription: ${cancelResponse.status}`);
          }

          console.log("[CANCEL-SUBSCRIPTION] MP subscription canceled successfully");
        } catch (mpError) {
          console.error("[CANCEL-SUBSCRIPTION] Error canceling MP subscription:", mpError);
          // Continue to update database even if MP cancellation fails
        }
      }

      // Update database to mark as canceled
      const { error: updateError } = await supabaseClient
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          plan: 'free',
          subscribed: false,
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[CANCEL-SUBSCRIPTION] Error updating subscription:', updateError);
        throw updateError;
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Suscripción cancelada exitosamente',
        payment_gateway: 'mercadopago',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle Stripe subscriptions
    if (!dbSubscription.stripe_subscription_id) {
      throw new Error("No Stripe subscription ID found");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    console.log("[CANCEL-SUBSCRIPTION] Canceling Stripe subscription:", dbSubscription.stripe_subscription_id);

    // Cancel the subscription at period end (not immediately)
    const subscription = await stripe.subscriptions.update(
      dbSubscription.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    console.log("[CANCEL-SUBSCRIPTION] Subscription will cancel at period end");

    // Update database
    const { error: updateError } = await supabaseClient
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[CANCEL-SUBSCRIPTION] Error updating subscription:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Tu suscripción se cancelará al final del período actual',
      payment_gateway: 'stripe',
      cancel_at: subscription.cancel_at,
      current_period_end: subscription.current_period_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[CANCEL-SUBSCRIPTION] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
