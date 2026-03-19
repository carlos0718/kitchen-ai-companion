// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callGeminiJSON } from "../_shared/gemini.ts";
import { COUNTRY_NAMES, INGREDIENT_LOCALIZATION_GUIDE } from "../_shared/agents/base-agent.ts";

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

interface ShoppingItem {
  name: string;
  amount: number;
  unit: string;
  recipe_names: string[];
}

interface ShoppingListResponse {
  success: boolean;
  categories: Record<string, ShoppingItem[]>;
  total_items: number;
  week_start: string;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { user_id, week_start } = await req.json() as {
      user_id: string;
      week_start: string; // "YYYY-MM-DD"
    };

    if (!user_id || !week_start) {
      return new Response(JSON.stringify({ error: "user_id y week_start son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get user country for ingredient localization
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("country")
      .eq("user_id", user_id)
      .single();

    const country = profile?.country || "AR";
    const countryName = COUNTRY_NAMES[country] || country;

    // Query all meal plan items for the week, joined with recipes
    const weekEnd = new Date(week_start);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const { data: mealItems, error: mealError } = await supabase
      .from("meal_plan_items")
      .select(`
        meal_type,
        date,
        recipes!inner(name, ingredients, servings)
      `)
      .gte("date", week_start)
      .lt("date", weekEndStr)
      .eq("meal_plans.user_id", user_id);

    // Fallback: join via meal_plans
    let items = mealItems;
    if (mealError || !items?.length) {
      const { data: mealPlans } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("user_id", user_id)
        .gte("week_start", week_start)
        .lte("week_start", weekEndStr);

      if (mealPlans?.length) {
        const planIds = mealPlans.map((p: { id: string }) => p.id);
        const { data: planItems } = await supabase
          .from("meal_plan_items")
          .select("meal_type, date, recipes(name, ingredients, servings)")
          .in("meal_plan_id", planIds)
          .gte("date", week_start)
          .lt("date", weekEndStr);
        items = planItems;
      }
    }

    if (!items?.length) {
      return new Response(
        JSON.stringify({ success: true, categories: {}, total_items: 0, week_start }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Flatten all ingredients with their recipe names
    const allIngredients: Array<{ ingredient: Ingredient; recipeName: string }> = [];
    for (const item of items) {
      const recipe = (item as { meal_type: string; date: string; recipes: { name: string; ingredients: Ingredient[]; servings: number } }).recipes;
      if (!recipe?.ingredients) continue;
      for (const ing of recipe.ingredients) {
        allIngredients.push({ ingredient: ing, recipeName: recipe.name });
      }
    }

    if (!allIngredients.length) {
      return new Response(
        JSON.stringify({ success: true, categories: {}, total_items: 0, week_start }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build Gemini prompt for deduplication + categorization
    const ingredientList = allIngredients
      .map(({ ingredient, recipeName }) =>
        `- ${ingredient.amount} ${ingredient.unit} de ${ingredient.name} (receta: ${recipeName})`
      )
      .join("\n");

    const prompt = `Eres un asistente de compras de cocina. Tu tarea es procesar esta lista de ingredientes de un plan semanal y devolver una lista de compras organizada.

PAÍS DEL USUARIO: ${countryName} (${country})
⚠️ Usa los nombres de ingredientes como se conocen en ${countryName}.
${INGREDIENT_LOCALIZATION_GUIDE}

INGREDIENTES DEL PLAN SEMANAL:
${ingredientList}

INSTRUCCIONES:
1. Combina ingredientes duplicados o similares sumando cantidades (ej: "pechuga de pollo" + "pollo" → "Pollo")
2. Organiza en estas categorías:
   - "Frutas y Verduras"
   - "Carnes y Pescados"
   - "Lácteos"
   - "Huevos"
   - "Granos y Cereales"
   - "Legumbres"
   - "Condimentos y Especias"
   - "Aceites y Salsas"
   - "Despensa"
   - "Otros"
3. Para cada ingrediente incluye las recetas que lo usan

Responde SOLO con JSON válido en este formato exacto:
{
  "categories": {
    "Frutas y Verduras": [
      {"name": "Nombre localizado", "amount": 500, "unit": "g", "recipe_names": ["Receta 1", "Receta 2"]}
    ],
    "Carnes y Pescados": []
  }
}

Omite categorías vacías.`;

    const result = await callGeminiJSON<{ categories: Record<string, ShoppingItem[]> }>(
      [{ role: "user", parts: [{ text: prompt }] }],
      { temperature: 0.3, maxOutputTokens: 2000 },
    );

    const categories = result.categories ?? {};
    const totalItems = Object.values(categories).reduce((sum, items) => sum + items.length, 0);

    const response: ShoppingListResponse = {
      success: true,
      categories,
      total_items: totalItems,
      week_start,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-shopping-list] Error:", error);
    return new Response(
      JSON.stringify({ error: "Error al generar la lista de compras" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
