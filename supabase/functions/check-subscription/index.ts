import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1Sm4wc2Qj13dqOT58FrsxHdn": "weekly",
  "price_1Sm4xM2Qj13dqOT5NQqZrZsq": "monthly",
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
    console.log("[CHECK-SUBSCRIPTION] Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    console.log("[CHECK-SUBSCRIPTION] Checking for user:", user.email);

    // First, check if user has a subscription in the database
    const { data: dbSubscription, error: dbError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If user has a Mercado Pago or manual subscription, handle it separately
    if (dbSubscription && (dbSubscription.payment_gateway === 'mercadopago' || dbSubscription.payment_gateway === 'manual')) {
      console.log("[CHECK-SUBSCRIPTION] Found", dbSubscription.payment_gateway, "subscription");

      // Check if subscription has expired
      const now = new Date();
      if (!dbSubscription.current_period_end) {
        console.log("[CHECK-SUBSCRIPTION] No period end date, treating as expired");
        await supabaseClient
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            plan: 'free',
            subscribed: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        return new Response(JSON.stringify({
          subscribed: false,
          plan: 'free',
          status: 'expired',
          payment_gateway: 'mercadopago',
          is_recurring: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const periodEnd = new Date(dbSubscription.current_period_end);
      const isExpired = periodEnd < now;

      // Check if subscription was cancelled and period has ended
      if (isExpired && (dbSubscription.status === 'active' || dbSubscription.cancel_at_period_end)) {
        console.log("[CHECK-SUBSCRIPTION] Mercado Pago subscription period ended - finalizing cancellation");

        // Finalize cancellation - now actually remove access
        await supabaseClient
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            plan: 'free',
            subscribed: false,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        // Return expired status
        return new Response(JSON.stringify({
          subscribed: false,
          plan: 'free',
          status: 'expired',
          payment_gateway: dbSubscription.payment_gateway,
          is_recurring: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Calculate days until expiration
      let daysUntilExpiration = null;
      if (dbSubscription.is_recurring === false && dbSubscription.current_period_end) {
        const diffTime = periodEnd.getTime() - now.getTime();
        daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Return current Mercado Pago subscription status
      // User keeps access even if cancel_at_period_end is true, until period ends
      const isStillActive = dbSubscription.subscribed || dbSubscription.status === 'active';

      return new Response(JSON.stringify({
        subscribed: isStillActive,
        plan: dbSubscription.plan,
        status: dbSubscription.cancel_at_period_end ? 'canceling' : dbSubscription.status,
        payment_gateway: dbSubscription.payment_gateway,
        is_recurring: dbSubscription.is_recurring && !dbSubscription.cancel_at_period_end,
        current_period_start: dbSubscription.current_period_start,
        current_period_end: dbSubscription.current_period_end,
        days_until_expiration: daysUntilExpiration,
        cancel_at_period_end: dbSubscription.cancel_at_period_end || false,
        canceled_at: dbSubscription.canceled_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Continue with Stripe flow
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      console.log("[CHECK-SUBSCRIPTION] No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: "free" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    console.log("[CHECK-SUBSCRIPTION] Found customer:", customerId);

    // Get all subscriptions (not just active) to handle past_due, canceled, etc.
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    const hasSub = subscriptions.data.length > 0;
    let plan = "free";
    let subscriptionEnd = null;
    let status = null;
    let cancelAtPeriodEnd = false;
    let trialEnd = null;

    let periodStart = null;
    let periodEnd = null;

    if (hasSub) {
      const subscription = subscriptions.data[0];
      status = subscription.status;
      periodStart = new Date(subscription.current_period_start * 1000).toISOString();
      periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      subscriptionEnd = periodEnd;
      cancelAtPeriodEnd = subscription.cancel_at_period_end;
      trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;

      const priceId = subscription.items.data[0].price.id;
      plan = PRICE_TO_PLAN[priceId] || "premium";

      console.log("[CHECK-SUBSCRIPTION] Subscription found:", { plan, status, cancelAtPeriodEnd });

      // Persist subscription data to database
      const { error: upsertError } = await supabaseClient
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan: plan,
          status: status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          trial_end: trialEnd,
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('[CHECK-SUBSCRIPTION] Error upserting subscription:', upsertError);
      } else {
        console.log('[CHECK-SUBSCRIPTION] Subscription data persisted to database');
      }
    }

    // Consider subscription active if status is 'active' or 'trialing'
    const isSubscribed = hasSub && (status === 'active' || status === 'trialing');

    return new Response(JSON.stringify({
      subscribed: isSubscribed,
      plan,
      status,
      subscription_end: subscriptionEnd,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      trial_end: trialEnd,
      payment_gateway: 'stripe',
      is_recurring: true, // Stripe subscriptions are always recurring
      days_until_expiration: null, // Stripe subscriptions don't expire (they auto-renew)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[CHECK-SUBSCRIPTION] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
