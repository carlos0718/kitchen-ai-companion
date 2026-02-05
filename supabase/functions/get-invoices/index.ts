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

  try {
    console.log("[GET-INVOICES] === FUNCTION STARTED ===");

    const authHeader = req.headers.get("Authorization");
    console.log("[GET-INVOICES] Auth header:", authHeader ? "present" : "missing");

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (!authHeader) {
      console.error("[GET-INVOICES] ERROR: No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      console.error("[GET-INVOICES] ERROR: Auth failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = userData.user;
    console.log("[GET-INVOICES] User authenticated:", user.id);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    console.log("[GET-INVOICES] Fetching invoices for user:", user.id);

    // Get user's subscription data from database
    const { data: subscription, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      console.log("[GET-INVOICES] No subscription found for user");
      return new Response(
        JSON.stringify({ invoices: [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let formattedInvoices: any[] = [];

    // Handle Mercado Pago subscriptions
    if (subscription.payment_gateway === 'mercadopago') {
      console.log("[GET-INVOICES] Found Mercado Pago subscription - creating synthetic invoice");

      // Create a synthetic invoice from the subscription data
      // Show invoice if there's a payment or active subscription
      if (subscription.status === 'active' || subscription.mercadopago_payment_id || subscription.mercadopago_subscription_id || subscription.cancel_at_period_end) {
        const periodStart = subscription.current_period_start ? new Date(subscription.current_period_start).getTime() / 1000 : Date.now() / 1000;
        const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end).getTime() / 1000 : Date.now() / 1000;

        // Determine plan type based on period duration (more reliable than stored plan)
        const periodDays = Math.round((periodEnd - periodStart) / (60 * 60 * 24));
        const isWeekly = periodDays <= 8; // 7 days with some tolerance

        // Get the actual price based on period
        const weeklyPrice = 7500;
        const monthlyPrice = 25000;
        const amount = isWeekly ? weeklyPrice : monthlyPrice;
        const actualPlan = isWeekly ? 'weekly' : 'monthly';

        const syntheticInvoice = {
          id: subscription.mercadopago_payment_id || subscription.mercadopago_subscription_id,
          number: subscription.mercadopago_payment_id ? subscription.mercadopago_payment_id.toString() : null,
          amount: amount,
          currency: 'ARS',
          status: 'paid',
          created: periodStart,
          period_start: periodStart,
          period_end: periodEnd,
          invoice_pdf: null, // MercadoPago doesn't provide PDF invoices directly
          hosted_invoice_url: subscription.mercadopago_subscription_id
            ? `https://www.mercadopago.com.ar/subscriptions/${subscription.mercadopago_subscription_id}`
            : null,
          payment_method: {
            type: 'mercadopago',
            last4: null,
            brand: 'Mercado Pago',
          },
          description: `Suscripción ${actualPlan === 'weekly' ? 'Semanal' : 'Mensual'} - Mercado Pago`,
        };

        formattedInvoices.push(syntheticInvoice);
      }

      return new Response(
        JSON.stringify({ invoices: formattedInvoices }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Handle Stripe subscriptions
    if (!subscription.stripe_customer_id) {
      console.log("[GET-INVOICES] No Stripe customer found for user");
      return new Response(
        JSON.stringify({ invoices: [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const customerId = subscription.stripe_customer_id;
    console.log("[GET-INVOICES] Found Stripe customer:", customerId);

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    // Fetch invoices from Stripe (last 12)
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
      expand: ["data.payment_intent.payment_method"],
    });

    console.log("[GET-INVOICES] Found", invoices.data.length, "Stripe invoices");

    // Format invoice data for frontend
    formattedInvoices = invoices.data.map((invoice) => {
      // Get payment method details if available
      let paymentMethod = null;
      if (invoice.payment_intent && typeof invoice.payment_intent !== "string") {
        const pm = invoice.payment_intent.payment_method;
        if (pm && typeof pm !== "string") {
          paymentMethod = {
            type: pm.type,
            last4: pm.card?.last4 || null,
            brand: pm.card?.brand || null,
          };
        }
      }

      return {
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount_paid / 100, // Convert from cents to dollars
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        payment_method: paymentMethod,
        description: invoice.lines.data[0]?.description || "Suscripción",
      };
    });

    return new Response(
      JSON.stringify({ invoices: formattedInvoices }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[GET-INVOICES] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
