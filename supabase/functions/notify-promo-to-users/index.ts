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

  try {
    // Only admins can call this — verify via service role header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acceso denegado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { promo_code_id } = await req.json();
    if (!promo_code_id) {
      return new Response(JSON.stringify({ error: "promo_code_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the promo code
    const { data: promo, error: promoError } = await supabase
      .from("promo_codes")
      .select("code, type, value, is_active")
      .eq("id", promo_code_id)
      .single();

    if (promoError || !promo) {
      return new Response(JSON.stringify({ error: "Cupón no encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!promo.is_active) {
      return new Response(JSON.stringify({ error: "El cupón no está activo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all user_profiles whose user_id is NOT in user_subscriptions
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id")
      .not("user_id", "in", `(select user_id from user_subscriptions)`);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: "Error al obtener usuarios" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const benefit = promo.type === "free_trial"
      ? `${promo.value} días gratis de Premium`
      : `${promo.value}% de descuento en tu suscripción`;

    const notifications = profiles.map((p) => ({
      user_id: p.user_id,
      type: "promo_available",
      title: "¡Tenés un cupón esperándote!",
      message: `Usá el código ${promo.code} y obtené ${benefit}. ¡Activalo ahora y disfrutá la app completa!`,
      severity: "success",
      read: false,
      action_url: "/chat",
    }));

    // Insert in batches of 100 to avoid payload limits
    const batchSize = 100;
    let notified = 0;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("user_notifications").insert(batch);
      if (!insertError) notified += batch.length;
    }

    return new Response(JSON.stringify({ success: true, notified }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("notify-promo-to-users error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
