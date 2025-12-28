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
    console.log("[GET-INVOICES] Function started");

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

    console.log("[GET-INVOICES] Fetching invoices for user:", user.id);

    // Get user's Stripe customer ID from database
    const { data: subscription, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      console.log("[GET-INVOICES] No customer found for user");
      return new Response(
        JSON.stringify({ invoices: [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const customerId = subscription.stripe_customer_id;
    console.log("[GET-INVOICES] Found customer:", customerId);

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch invoices from Stripe (last 12)
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
      expand: ["data.payment_intent.payment_method"],
    });

    console.log("[GET-INVOICES] Found", invoices.data.length, "invoices");

    // Format invoice data for frontend
    const formattedInvoices = invoices.data.map((invoice) => {
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
