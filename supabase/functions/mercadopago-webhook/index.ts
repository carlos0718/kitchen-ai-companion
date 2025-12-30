import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

interface MercadoPagoWebhook {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: number;
  user_id: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  date_created: string;
  date_approved: string | null;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
  metadata: {
    user_id: string;
    plan: string;
    period_start: string;
    period_end: string;
  };
  external_reference: string;
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
    console.log("[MP-WEBHOOK] Webhook received");

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
    }

    // Get webhook signature for validation
    const signature = req.headers.get("x-signature");
    const requestId = req.headers.get("x-request-id");

    console.log("[MP-WEBHOOK] Request ID:", requestId);

    // Parse webhook body
    const webhook: MercadoPagoWebhook = await req.json();
    console.log("[MP-WEBHOOK] Webhook data:", JSON.stringify(webhook, null, 2));

    // Only process payment notifications
    if (webhook.type !== "payment" && webhook.action !== "payment.created" && webhook.action !== "payment.updated") {
      console.log("[MP-WEBHOOK] Ignoring non-payment webhook");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const paymentId = webhook.data.id;
    const eventId = `${webhook.action}_${paymentId}_${webhook.date_created}`;

    console.log("[MP-WEBHOOK] Processing payment:", paymentId);

    // Check for idempotency - have we already processed this event?
    const { data: existingEvent } = await supabaseClient
      .from("subscription_events")
      .select("id")
      .eq("mercadopago_event_id", eventId)
      .single();

    if (existingEvent) {
      console.log("[MP-WEBHOOK] Event already processed (idempotency)");
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch payment details from Mercado Pago API
    console.log("[MP-WEBHOOK] Fetching payment details from API...");
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
      },
    });

    if (!paymentResponse.ok) {
      throw new Error(`Failed to fetch payment: ${paymentResponse.status}`);
    }

    const payment: MercadoPagoPayment = await paymentResponse.json();
    console.log("[MP-WEBHOOK] Payment status:", payment.status);

    // Get user_id from metadata or external_reference
    const userId = payment.metadata?.user_id || payment.external_reference;
    if (!userId) {
      throw new Error("No user_id found in payment metadata");
    }

    // Get subscription data
    const { data: subscription, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (subError || !subscription) {
      throw new Error(`Subscription not found for user: ${userId}`);
    }

    // Process based on payment status
    let newStatus: string;
    let notificationTitle: string;
    let notificationMessage: string;
    let notificationType: "success" | "info" | "warning" | "error";

    switch (payment.status) {
      case "approved":
        newStatus = "active";
        notificationTitle = "¡Pago aprobado!";
        notificationMessage = `Tu suscripción ${subscription.plan === "weekly" ? "semanal" : "mensual"} ha sido activada correctamente.`;
        notificationType = "success";
        console.log("[MP-WEBHOOK] Payment approved - activating subscription");
        break;

      case "pending":
      case "in_process":
        newStatus = "pending";
        notificationTitle = "Pago en proceso";
        notificationMessage = "Tu pago está siendo procesado. Te notificaremos cuando se complete.";
        notificationType = "info";
        console.log("[MP-WEBHOOK] Payment pending");
        break;

      case "rejected":
      case "cancelled":
        newStatus = "canceled";
        notificationTitle = "Pago rechazado";
        notificationMessage = "Tu pago fue rechazado. Por favor, intenta nuevamente con otro método de pago.";
        notificationType = "error";
        console.log("[MP-WEBHOOK] Payment rejected/cancelled");
        break;

      default:
        console.log("[MP-WEBHOOK] Unknown payment status:", payment.status);
        newStatus = subscription.status;
        notificationTitle = "Actualización de pago";
        notificationMessage = `Estado del pago: ${payment.status}`;
        notificationType = "info";
    }

    // Update subscription in database
    const updateData: any = {
      status: newStatus,
      mercadopago_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    };

    // If approved, update subscription details
    if (payment.status === "approved") {
      updateData.subscribed = true;
      // Use metadata periods if available, otherwise use existing
      if (payment.metadata?.period_start) {
        updateData.current_period_start = payment.metadata.period_start;
      }
      if (payment.metadata?.period_end) {
        updateData.current_period_end = payment.metadata.period_end;
      }
      if (payment.metadata?.plan) {
        updateData.plan = payment.metadata.plan;
      }
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      updateData.subscribed = false;
      updateData.plan = "free";
    }

    const { error: updateError } = await supabaseClient
      .from("user_subscriptions")
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[MP-WEBHOOK] Error updating subscription:", updateError);
      throw updateError;
    }

    console.log("[MP-WEBHOOK] Subscription updated successfully");

    // Create subscription event for idempotency
    const { error: eventError } = await supabaseClient
      .from("subscription_events")
      .insert({
        user_id: userId,
        event_type: payment.status,
        mercadopago_event_id: eventId,
        event_data: payment,
        created_at: new Date().toISOString(),
      });

    if (eventError) {
      console.error("[MP-WEBHOOK] Error creating event:", eventError);
      // Don't throw - event is for idempotency, subscription is already updated
    }

    // Create notification for user
    const { error: notifError } = await supabaseClient
      .from("user_notifications")
      .insert({
        user_id: userId,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        related_entity: "subscription",
        created_at: new Date().toISOString(),
      });

    if (notifError) {
      console.error("[MP-WEBHOOK] Error creating notification:", notifError);
      // Don't throw - notification is not critical
    }

    console.log("[MP-WEBHOOK] Webhook processed successfully");

    return new Response(
      JSON.stringify({ received: true, status: payment.status }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[MP-WEBHOOK] Error:", errorMessage);

    // Always return 200 to Mercado Pago to avoid retries
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
