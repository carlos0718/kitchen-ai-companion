// deno-lint-ignore-file
// Triggered by pg_cron every Sunday at 20:00 UTC
// Generates a weekly nutritional summary for active premium users
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callGeminiJSON } from "../_shared/gemini.ts";

const MAX_USERS_PER_RUN = 5000; // Cost safeguard

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Verify cron secret
  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[weekly-digest] Unauthorized request");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results = { processed: 0, skipped: 0, errors: 0, total_found: 0 };

  try {
    // 1. Find active premium users (cost-controlled)
    const { data: activeSubscribers, error: subError } = await supabase
      .from("user_subscriptions")
      .select("user_id, plan")
      .eq("status", "active")
      .eq("subscribed", true)
      .limit(MAX_USERS_PER_RUN);

    if (subError || !activeSubscribers?.length) {
      console.log("[weekly-digest] No active subscribers found");
      return new Response(JSON.stringify({ ...results, message: "No active subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    results.total_found = activeSubscribers.length;
    console.log(`[weekly-digest] Found ${results.total_found} active subscribers`);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // Current week bounds
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = now.toISOString().split("T")[0];

    // 2. Process each eligible user
    for (const subscriber of activeSubscribers) {
      try {
        const userId = subscriber.user_id;

        // Check activity: must have a conversation updated in last 7 days
        const { count: activityCount } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("updated_at", sevenDaysAgoStr);

        if (!activityCount || activityCount === 0) {
          results.skipped++;
          continue;
        }

        // Get user profile for personalization
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("name, fitness_goal, diet_type")
          .eq("user_id", userId)
          .single();

        // Get this week's meal plan nutrition data
        const { data: mealPlanItems } = await supabase
          .from("meal_plan_items")
          .select("meal_type, date, recipes(name, nutrition)")
          .gte("date", weekStartStr)
          .lte("date", weekEndStr);

        // Calculate weekly nutritional summary
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let mealCount = 0;
        const recipeNames: string[] = [];

        if (mealPlanItems?.length) {
          for (const item of mealPlanItems) {
            const recipe = (item as { recipes?: { name: string; nutrition?: { calories: number; protein: number; carbs: number; fat: number } } }).recipes;
            if (recipe?.nutrition) {
              totalCalories += recipe.nutrition.calories ?? 0;
              totalProtein += recipe.nutrition.protein ?? 0;
              totalCarbs += recipe.nutrition.carbs ?? 0;
              totalFat += recipe.nutrition.fat ?? 0;
              mealCount++;
            }
            if (recipe?.name) recipeNames.push(recipe.name);
          }
        }

        // Build Gemini prompt for motivational summary
        const userName = profile?.name || "Usuario";
        const goal = profile?.fitness_goal || "eat_healthy";
        const goalText = { lose_weight: "bajar de peso", gain_muscle: "ganar músculo", maintain: "mantener peso", eat_healthy: "comer saludable" }[goal] || "comer saludable";

        const nutritionSummary = mealCount > 0
          ? `Esta semana registró ${mealCount} comidas. Promedio diario: ${Math.round(totalCalories / 7)} kcal, ${Math.round(totalProtein / 7)}g proteína, ${Math.round(totalCarbs / 7)}g carbos, ${Math.round(totalFat / 7)}g grasas. Algunas recetas: ${recipeNames.slice(0, 3).join(", ")}.`
          : "No registró comidas esta semana en el planificador.";

        const prompt = `Eres Chef AI, un nutricionista deportivo motivador. Genera un resumen semanal personalizado y motivador de exactamente 2-3 oraciones para ${userName}, cuyo objetivo es ${goalText}.

${nutritionSummary}

El resumen debe:
- Ser positivo y motivador
- Mencionar algo específico de su semana si hay datos
- Invitarle a seguir planificando la próxima semana
- Usar 1-2 emojis máximo
- Máximo 3 oraciones

Responde con JSON: {"summary": "texto del resumen aquí"}`;

        const geminiResult = await callGeminiJSON<{ summary: string }>(
          [{ role: "user", parts: [{ text: prompt }] }],
          { temperature: 0.7, maxOutputTokens: 200 },
        );

        const summaryText = geminiResult.summary || "¡Esta semana es una nueva oportunidad para seguir avanzando hacia tus objetivos! 💪 Planifica tus comidas y mantén el rumbo.";

        // Insert notification
        await supabase.from("user_notifications").insert({
          user_id: userId,
          type: "weekly_digest",
          title: "📊 Tu resumen nutricional semanal",
          message: summaryText,
          severity: "info",
          read: false,
          action_url: "/planner",
        });

        results.processed++;
        console.log(`[weekly-digest] Processed user ${userId}`);

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (userError) {
        console.error(`[weekly-digest] Error processing user:`, userError);
        results.errors++;
      }
    }

    console.log(`[weekly-digest] Done. Processed: ${results.processed}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[weekly-digest] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: "Error en el agente de digest semanal", ...results }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
