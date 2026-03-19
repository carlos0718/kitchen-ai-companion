// deno-lint-ignore-file
// This function is a backward-compatible proxy to agent-coordinator.
// The actual logic lives in supabase/functions/agent-coordinator/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");

    // Clone request body
    const body = await req.text();

    const coordinatorUrl = `${supabaseUrl}/functions/v1/agent-coordinator`;
    const response = await fetch(coordinatorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("Authorization") ?? "",
        "x-client-info": req.headers.get("x-client-info") ?? "",
        apikey: req.headers.get("apikey") ?? "",
      },
      body,
    });

    // Pipe the response through directly
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": response.headers.get("Cache-Control") ?? "no-cache",
        "X-Agent-Type": response.headers.get("X-Agent-Type") ?? "chef",
      },
    });
  } catch (error) {
    console.error("[chat-cocina proxy] Error:", error);
    return new Response(
      JSON.stringify({ error: "Ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
