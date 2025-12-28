import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

// Helper function to create user notifications
async function createNotification(
  supabase: any,
  userId: string,
  data: {
    type: string;
    title: string;
    message: string;
    severity: "info" | "warning" | "error";
    action_url?: string;
  }
) {
  try {
    const { error } = await supabase
      .from("user_notifications")
      .insert({
        user_id: userId,
        type: data.type,
        title: data.title,
        message: data.message,
        severity: data.severity,
        action_url: data.action_url,
      });

    if (error) {
      console.error("[NOTIFICATION] Error creating notification:", error);
    } else {
      console.log(`[NOTIFICATION] Created notification for user ${userId}: ${data.title}`);
    }
  } catch (error) {
    console.error("[NOTIFICATION] Exception creating notification:", error);
  }
}

// Helper function to log subscription events
async function logSubscriptionEvent(
  supabase: any,
  userId: string | null,
  stripeEventId: string,
  eventType: string,
  eventData: any
) {
  try {
    const { error } = await supabase
      .from("subscription_events")
      .insert({
        user_id: userId,
        stripe_event_id: stripeEventId,
        event_type: eventType,
        event_data: eventData,
      });

    if (error) {
      // Check if it's a duplicate event (idempotency)
      if (error.code === "23505") {
        console.log(`[EVENT] Event ${stripeEventId} already processed (idempotent)`);
        return false; // Event already processed
      }
      console.error("[EVENT] Error logging event:", error);
    } else {
      console.log(`[EVENT] Logged event ${eventType} for event ${stripeEventId}`);
    }
    return true; // Event logged successfully
  } catch (error) {
    console.error("[EVENT] Exception logging event:", error);
    return true; // Process anyway
  }
}

// Helper function to get user ID from customer ID
async function getUserIdFromCustomer(supabase: any, customerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (error || !data) {
    console.error("[USER] Error finding user for customer:", customerId, error);
    return null;
  }

  return data.user_id;
}

// Handler for customer.subscription.created
async function handleSubscriptionCreated(supabase: any, subscription: Stripe.Subscription) {
  console.log("[SUBSCRIPTION.CREATED] Processing subscription:", subscription.id);

  const customerId = subscription.customer as string;
  const userId = await getUserIdFromCustomer(supabase, customerId);

  if (!userId) {
    console.error("[SUBSCRIPTION.CREATED] Could not find user for customer:", customerId);
    return;
  }

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let plan = "free";
  if (priceId === "price_1SenRDCxUyIaGomE90wjTqaY") plan = "weekly";
  else if (priceId === "price_1SenRaCxUyIaGomE2UPpVqeE") plan = "monthly";

  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;

  // Update subscription in database
  const { error } = await supabase
    .from("user_subscriptions")
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan: plan,
      status: subscription.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      trial_end: trialEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    console.error("[SUBSCRIPTION.CREATED] Error updating subscription:", error);
    return;
  }

  // Create welcome notification
  await createNotification(supabase, userId, {
    type: "subscription_created",
    title: "¡Bienvenido a Kitchen AI Premium!",
    message: `Tu suscripción ${plan === "weekly" ? "semanal" : "mensual"} está activa. Disfruta de todas las funcionalidades premium.`,
    severity: "info",
    action_url: "/planner",
  });

  console.log("[SUBSCRIPTION.CREATED] Subscription created successfully for user:", userId);
}

// Handler for customer.subscription.updated
async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  console.log("[SUBSCRIPTION.UPDATED] Processing subscription:", subscription.id);

  const customerId = subscription.customer as string;
  const userId = await getUserIdFromCustomer(supabase, customerId);

  if (!userId) {
    console.error("[SUBSCRIPTION.UPDATED] Could not find user for customer:", customerId);
    return;
  }

  // Get current subscription to detect changes
  const { data: currentSub } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let plan = "free";
  if (priceId === "price_1SenRDCxUyIaGomE90wjTqaY") plan = "weekly";
  else if (priceId === "price_1SenRaCxUyIaGomE2UPpVqeE") plan = "monthly";

  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
  const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null;

  // Update subscription in database
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      stripe_subscription_id: subscription.id,
      plan: plan,
      status: subscription.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      trial_end: trialEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: canceledAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[SUBSCRIPTION.UPDATED] Error updating subscription:", error);
    return;
  }

  // Detect changes and create notifications
  if (currentSub) {
    // Plan upgrade/downgrade
    if (currentSub.plan !== plan) {
      const isUpgrade = plan === "monthly" && currentSub.plan === "weekly";
      await createNotification(supabase, userId, {
        type: "subscription_changed",
        title: isUpgrade ? "Suscripción mejorada" : "Suscripción modificada",
        message: `Tu plan ha cambiado de ${currentSub.plan} a ${plan}.`,
        severity: "info",
      });
    }

    // Subscription scheduled for cancellation
    if (subscription.cancel_at_period_end && !currentSub.cancel_at_period_end) {
      await createNotification(supabase, userId, {
        type: "subscription_canceling",
        title: "Suscripción programada para cancelar",
        message: `Tu suscripción se cancelará el ${new Date(periodEnd).toLocaleDateString("es-AR")}. Aún puedes usar todas las funcionalidades hasta entonces.`,
        severity: "warning",
        action_url: "/profile",
      });
    }

    // Subscription reactivated
    if (!subscription.cancel_at_period_end && currentSub.cancel_at_period_end) {
      await createNotification(supabase, userId, {
        type: "subscription_reactivated",
        title: "Suscripción reactivada",
        message: "Tu suscripción ha sido reactivada y continuará renovándose automáticamente.",
        severity: "info",
      });
    }
  }

  console.log("[SUBSCRIPTION.UPDATED] Subscription updated successfully for user:", userId);
}

// Handler for customer.subscription.deleted
async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  console.log("[SUBSCRIPTION.DELETED] Processing subscription:", subscription.id);

  const customerId = subscription.customer as string;
  const userId = await getUserIdFromCustomer(supabase, customerId);

  if (!userId) {
    console.error("[SUBSCRIPTION.DELETED] Could not find user for customer:", customerId);
    return;
  }

  const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : new Date().toISOString();

  // Update subscription to canceled status
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      canceled_at: canceledAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[SUBSCRIPTION.DELETED] Error updating subscription:", error);
    return;
  }

  // Create notification
  await createNotification(supabase, userId, {
    type: "subscription_canceled",
    title: "Suscripción cancelada",
    message: "Tu suscripción premium ha finalizado. Esperamos verte de nuevo pronto.",
    severity: "info",
    action_url: "/pricing",
  });

  console.log("[SUBSCRIPTION.DELETED] Subscription deleted for user:", userId);
}

// Handler for invoice.payment_succeeded
async function handleInvoicePaymentSucceeded(supabase: any, invoice: Stripe.Invoice) {
  console.log("[INVOICE.PAYMENT_SUCCEEDED] Processing invoice:", invoice.id);

  const customerId = invoice.customer as string;
  const userId = await getUserIdFromCustomer(supabase, customerId);

  if (!userId) {
    console.error("[INVOICE.PAYMENT_SUCCEEDED] Could not find user for customer:", customerId);
    return;
  }

  const subscriptionId = invoice.subscription as string;

  // Update latest invoice ID and reset past_due status if applicable
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      latest_invoice_id: invoice.id,
      status: "active", // Reset to active if was past_due
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("[INVOICE.PAYMENT_SUCCEEDED] Error updating subscription:", error);
    return;
  }

  // Only create notification if this is a renewal (not the first payment)
  if (invoice.billing_reason === "subscription_cycle") {
    await createNotification(supabase, userId, {
      type: "payment_succeeded",
      title: "Pago procesado exitosamente",
      message: `Tu suscripción ha sido renovada. Próximo cobro: ${new Date(invoice.period_end * 1000).toLocaleDateString("es-AR")}.`,
      severity: "info",
    });
  }

  console.log("[INVOICE.PAYMENT_SUCCEEDED] Invoice payment processed for user:", userId);
}

// Handler for invoice.payment_failed
async function handleInvoicePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  console.log("[INVOICE.PAYMENT_FAILED] Processing invoice:", invoice.id);

  const customerId = invoice.customer as string;
  const userId = await getUserIdFromCustomer(supabase, customerId);

  if (!userId) {
    console.error("[INVOICE.PAYMENT_FAILED] Could not find user for customer:", customerId);
    return;
  }

  const subscriptionId = invoice.subscription as string;

  // Update status to past_due
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      status: "past_due",
      latest_invoice_id: invoice.id,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("[INVOICE.PAYMENT_FAILED] Error updating subscription:", error);
    return;
  }

  // Create urgent notification
  await createNotification(supabase, userId, {
    type: "payment_failed",
    title: "Error en el pago de tu suscripción",
    message: "No pudimos procesar tu pago. Por favor actualiza tu método de pago para continuar usando las funcionalidades premium.",
    severity: "error",
    action_url: "/profile",
  });

  console.log("[INVOICE.PAYMENT_FAILED] Payment failure processed for user:", userId);
}

// Handler for customer.subscription.trial_will_end
async function handleTrialWillEnd(supabase: any, subscription: Stripe.Subscription) {
  console.log("[SUBSCRIPTION.TRIAL_WILL_END] Processing subscription:", subscription.id);

  const customerId = subscription.customer as string;
  const userId = await getUserIdFromCustomer(supabase, customerId);

  if (!userId) {
    console.error("[SUBSCRIPTION.TRIAL_WILL_END] Could not find user for customer:", customerId);
    return;
  }

  const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  if (!trialEndDate) {
    console.error("[SUBSCRIPTION.TRIAL_WILL_END] No trial end date found");
    return;
  }

  // Create notification
  await createNotification(supabase, userId, {
    type: "trial_ending",
    title: "Tu período de prueba está por finalizar",
    message: `Tu período de prueba finaliza el ${trialEndDate.toLocaleDateString("es-AR")}. Asegúrate de tener un método de pago válido configurado.`,
    severity: "warning",
    action_url: "/profile",
  });

  console.log("[SUBSCRIPTION.TRIAL_WILL_END] Trial ending notification sent to user:", userId);
}

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("[WEBHOOK] No signature provided");
      return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
    }

    if (!webhookSecret) {
      console.error("[WEBHOOK] No webhook secret configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { status: 500 });
    }

    // Get raw body as text
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[WEBHOOK] Signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    console.log(`[WEBHOOK] Received event: ${event.type} (${event.id})`);

    // Get user ID early for event logging
    let userId: string | null = null;
    if (event.type.startsWith("customer.subscription.") || event.type.startsWith("invoice.")) {
      const obj = event.data.object as any;
      const customerId = obj.customer as string;
      userId = await getUserIdFromCustomer(supabase, customerId);
    }

    // Log event (with idempotency check)
    const shouldProcess = await logSubscriptionEvent(
      supabase,
      userId,
      event.id,
      event.type,
      event.data.object
    );

    if (!shouldProcess) {
      console.log("[WEBHOOK] Event already processed, skipping");
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
    }

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(supabase, event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(supabase, event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[WEBHOOK] Error processing webhook:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
