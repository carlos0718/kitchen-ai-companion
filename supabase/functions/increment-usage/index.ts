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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const today = new Date().toISOString().split('T')[0];

    // Upsert usage record
    const { data: existingUsage } = await supabaseClient
      .from('usage_tracking')
      .select('id, query_count')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (existingUsage) {
      // Update existing record
      await supabaseClient
        .from('usage_tracking')
        .update({ query_count: existingUsage.query_count + 1 })
        .eq('id', existingUsage.id);
    } else {
      // Insert new record
      await supabaseClient
        .from('usage_tracking')
        .insert({ user_id: user.id, date: today, query_count: 1 });
    }

    console.log("[INCREMENT-USAGE] Incremented for user:", user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[INCREMENT-USAGE] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
