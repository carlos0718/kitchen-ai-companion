import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfile {
  user_id: string;
  name: string | null;
  age?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  gender?: string;
  dietary_restrictions: string[];
  allergies: string[];
  cuisine_preferences: string[];
  diet_type: string;
  snack_preference: string;
  flexible_mode: boolean;
  daily_calorie_goal: number | null;
  protein_goal: number | null;
  carbs_goal: number | null;
  fat_goal: number | null;
  household_size: number;
  cooking_skill_level: string;
  max_prep_time: number;
}

interface GeneratedMeal {
  day_index: number; // 0-6 (Monday-Sunday)
  meal_type: 'breakfast' | 'mid_morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner';
  recipe: {
    name: string;
    description: string;
    cuisine_type: string;
    difficulty: 'fácil' | 'media' | 'difícil';
    prep_time: number;
    cook_time: number;
    servings: number;
    ingredients: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
    instructions: Array<{
      step: number;
      description: string;
    }>;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
    };
    tags: string[];
  };
}

interface MealDistribution {
  breakfast: number;
  mid_morning_snack?: number;
  lunch: number;
  afternoon_snack?: number;
  dinner: number;
}

interface MacroDistribution {
  protein: number;  // Percentage of calories
  carbs: number;
  fat: number;
}

function calculateMealDistribution(
  dailyCalories: number,
  snackPreference: string
): MealDistribution {
  switch (snackPreference) {
    case '3meals':
      return {
        breakfast: Math.round(dailyCalories * 0.25),  // 25%
        lunch: Math.round(dailyCalories * 0.40),      // 40%
        dinner: Math.round(dailyCalories * 0.35),     // 35%
      };

    case '4meals':
      return {
        breakfast: Math.round(dailyCalories * 0.25),       // 25%
        mid_morning_snack: Math.round(dailyCalories * 0.10), // 10%
        lunch: Math.round(dailyCalories * 0.35),           // 35%
        dinner: Math.round(dailyCalories * 0.30),          // 30%
      };

    case '5meals':
      return {
        breakfast: Math.round(dailyCalories * 0.20),       // 20%
        mid_morning_snack: Math.round(dailyCalories * 0.10), // 10%
        lunch: Math.round(dailyCalories * 0.35),           // 35%
        afternoon_snack: Math.round(dailyCalories * 0.10), // 10%
        dinner: Math.round(dailyCalories * 0.25),          // 25%
      };

    default:
      return {
        breakfast: Math.round(dailyCalories * 0.25),
        lunch: Math.round(dailyCalories * 0.40),
        dinner: Math.round(dailyCalories * 0.35),
      };
  }
}

function getDietMacroDistribution(dietType: string): MacroDistribution {
  switch (dietType) {
    case 'keto':
      return { protein: 20, carbs: 10, fat: 70 };

    case 'paleo':
      return { protein: 30, carbs: 35, fat: 35 };

    case 'vegetariano':
    case 'vegano':
      return { protein: 20, carbs: 50, fat: 30 };

    case 'deportista':
      return { protein: 30, carbs: 45, fat: 25 };

    case 'ayuno_intermitente':
      return { protein: 25, carbs: 40, fat: 35 };

    case 'casera_normal':
    default:
      // Distribución estándar equilibrada
      return { protein: 25, carbs: 45, fat: 30 };
  }
}

function getMealTypeLabel(mealType: string): string {
  const labels: Record<string, string> = {
    breakfast: 'desayuno',
    mid_morning_snack: 'snack de media mañana',
    lunch: 'almuerzo',
    afternoon_snack: 'merienda',
    dinner: 'cena',
  };
  return labels[mealType] || mealType;
}

function buildMealPrompt(
  profile: UserProfile,
  mealType: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  userPreferences?: string,
  previousMeals?: string[] // Names of previously generated meals for this meal type
): string {
  const restrictionsText = profile.dietary_restrictions?.length
    ? profile.dietary_restrictions.join(', ')
    : 'ninguna';

  const allergiesText = profile.allergies?.length
    ? profile.allergies.join(', ')
    : 'ninguna';

  const dietType = profile.diet_type || 'casera_normal';
  const dietTypeDescription = dietType === 'casera_normal'
    ? 'comida casera normal, sin restricciones especiales, equilibrada y familiar'
    : `dieta ${dietType}`;

  const preferencesSection = userPreferences
    ? `\n⭐ PREFERENCIAS ESPECIALES DEL USUARIO: ${userPreferences}\n`
    : '';

  // Build variety instruction if there are previous meals
  const varietySection = previousMeals && previousMeals.length > 0
    ? `\n🔄 VARIEDAD IMPORTANTE: Ya se han generado las siguientes comidas para este tipo de comida en otros días de la semana:
${previousMeals.map((meal, i) => `- Día ${i + 1}: ${meal}`).join('\n')}

⚠️ DEBES generar una receta COMPLETAMENTE DIFERENTE a las anteriores. Varía:
- El tipo de plato principal (si antes fue huevos, ahora puede ser avena o tostadas)
- Los ingredientes principales
- El estilo de cocina
- La preparación

NO repitas recetas similares. Cada día debe tener una experiencia gastronómica distinta.\n`
    : '';

  return `Genera una receta para ${getMealTypeLabel(mealType)} que cumpla con los siguientes requisitos:
- Tipo de dieta: ${dietTypeDescription}
- Calorías: aproximadamente ${calories} kcal
- Proteína: ${protein}g
- Carbohidratos: ${carbs}g
- Grasas: ${fat}g
- Restricciones dietéticas: ${restrictionsText}
- Alergias: ${allergiesText}
- Preferencias de cocina: ${profile.cuisine_preferences?.join(', ') || 'variada'}
- Porciones: ${profile.household_size} persona(s)
- Tiempo máximo de preparación: ${profile.max_prep_time} minutos
${profile.flexible_mode ? '- Modo flexible: Puedes ser creativo con ingredientes similares' : '- Modo estricto: Sigue exactamente las restricciones'}${preferencesSection}${varietySection}
La receta debe ser práctica, con ingredientes accesibles y tiempo de preparación razonable.${userPreferences ? '\n\n¡IMPORTANTE! Ten en cuenta las preferencias especiales del usuario mencionadas arriba.' : ''}

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "name": "Nombre de la receta",
  "description": "Descripción breve de 1-2 líneas",
  "cuisine_type": "Tipo de cocina",
  "difficulty": "fácil",
  "prep_time": 15,
  "cook_time": 20,
  "servings": ${profile.household_size},
  "ingredients": [
    {"name": "Ingrediente 1", "amount": 100, "unit": "g"},
    {"name": "Ingrediente 2", "amount": 2, "unit": "unidades"}
  ],
  "instructions": [
    {"step": 1, "description": "Paso detallado 1"},
    {"step": 2, "description": "Paso detallado 2"}
  ],
  "nutrition": {
    "calories": ${calories},
    "protein": ${protein},
    "carbs": ${carbs},
    "fat": ${fat},
    "fiber": 5
  },
  "tags": ["${getMealTypeLabel(mealType)}", "saludable"]
}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== GENERATE MEAL PLAN FUNCTION STARTED ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);

    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const {
      userId,
      user_id,
      weekStart,
      week_start_date,
      mealPlanId,
      singleMeal = false,
      mealType: singleMealType,
      dateToReplace,
      itemIdToReplace,
      daysToGenerate = 7, // Default 7 days (full week), can be 1 for daily
      startDayOffset = 0, // Which day of the week to start from (0 = Monday, 6 = Sunday)
      userPreferences, // User's custom preferences for meal regeneration
    } = requestBody;

    const finalUserId = userId || user_id;
    const finalWeekStart = weekStart || week_start_date;

    console.log('Parsed params:', {
      finalUserId,
      finalWeekStart,
      daysToGenerate,
      startDayOffset,
      singleMeal,
      singleMealType
    });

    if (!finalUserId || !finalWeekStart) {
      console.error('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'user_id and week_start_date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Load user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', finalUserId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userProfile = profile as UserProfile;
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // =================================================================
    // SUBSCRIPTION VALIDATION
    // =================================================================
    console.log('=== SUBSCRIPTION VALIDATION ===');

    // 1. Get user's subscription status
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('plan, status, current_period_start, current_period_end')
      .eq('user_id', finalUserId)
      .single();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return new Response(
        JSON.stringify({
          error: 'subscription_check_failed',
          message: 'No se pudo verificar tu suscripción'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User subscription:', subscription);

    // 2. Validate user has active subscription (not free)
    if (!subscription || subscription.plan === 'free' || subscription.status !== 'active') {
      console.log('User does not have active paid subscription');
      return new Response(
        JSON.stringify({
          error: 'subscription_required',
          message: 'Necesitas una suscripción activa para usar el planificador de comidas',
          plan: subscription?.plan || 'free'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate period dates exist
    if (!subscription.current_period_start || !subscription.current_period_end) {
      console.error('Subscription missing period dates');
      return new Response(
        JSON.stringify({
          error: 'invalid_subscription',
          message: 'Tu suscripción no tiene fechas válidas. Por favor contacta soporte.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Calculate target dates for generation
    // Normalize dates to start of day for fair comparison
    const periodStart = new Date(subscription.current_period_start);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(subscription.current_period_end);
    periodEnd.setHours(23, 59, 59, 999);

    const weekStartDate = new Date(finalWeekStart);
    weekStartDate.setHours(0, 0, 0, 0);

    const now = new Date();

    console.log('Date validation:', {
      periodStart,
      periodEnd,
      weekStartDate,
      now,
      startDayOffset,
      daysToGenerate
    });

    // 5. Calculate the actual date range being generated
    const firstGeneratedDate = new Date(weekStartDate);
    firstGeneratedDate.setDate(firstGeneratedDate.getDate() + startDayOffset);
    firstGeneratedDate.setHours(0, 0, 0, 0);

    const lastGeneratedDate = new Date(firstGeneratedDate);
    lastGeneratedDate.setDate(lastGeneratedDate.getDate() + (daysToGenerate - 1));
    lastGeneratedDate.setHours(23, 59, 59, 999);

    console.log('Generation range:', {
      firstGeneratedDate,
      lastGeneratedDate
    });

    // 6. Validate dates are within subscription period
    if (firstGeneratedDate < periodStart) {
      return new Response(
        JSON.stringify({
          error: 'date_before_period',
          message: `No puedes generar comidas antes del inicio de tu período de suscripción (${periodStart.toLocaleDateString('es-AR')})`
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (lastGeneratedDate > periodEnd) {
      return new Response(
        JSON.stringify({
          error: 'date_after_period',
          message: `No puedes generar comidas después del final de tu período de suscripción (${periodEnd.toLocaleDateString('es-AR')}). ${subscription.plan === 'weekly' ? 'Con plan semanal puedes planificar hasta 7 días adelante.' : 'Con plan mensual puedes planificar hasta 30 días adelante.'}`,
          period_end: periodEnd.toISOString(),
          plan: subscription.plan
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Validate not planning too far in the past
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(0, 0, 0, 0);

    if (lastGeneratedDate < oneDayAgo) {
      return new Response(
        JSON.stringify({
          error: 'date_in_past',
          message: 'No puedes generar planes de comidas para fechas pasadas'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Subscription validation passed');
    // =================================================================
    // END SUBSCRIPTION VALIDATION
    // =================================================================

    // Handle single meal replacement
    if (singleMeal && singleMealType && dateToReplace && itemIdToReplace) {
      const snackPreference = userProfile.snack_preference || '3meals';
      const dietType = userProfile.diet_type || 'casera_normal';
      const mealDistribution = calculateMealDistribution(
        userProfile.daily_calorie_goal || 2000,
        snackPreference
      );
      const macroDistribution = getDietMacroDistribution(dietType);

      const mealCalories = (mealDistribution as unknown as Record<string, number>)[singleMealType] || 600;
      const mealProtein = Math.round((mealCalories * macroDistribution.protein / 100) / 4);
      const mealCarbs = Math.round((mealCalories * macroDistribution.carbs / 100) / 4);
      const mealFat = Math.round((mealCalories * macroDistribution.fat / 100) / 9);

      const prompt = buildMealPrompt(userProfile, singleMealType, mealCalories, mealProtein, mealCarbs, mealFat, userPreferences);

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Eres un chef experto. Responde SOLO con JSON válido.\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
          }),
        }
      );

      if (!aiResponse.ok) throw new Error(`AI generation failed: ${aiResponse.status}`);

      const aiData = await aiResponse.json();
      const content = aiData.candidates[0].content.parts[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON response from AI');

      const recipeData = JSON.parse(jsonMatch[0]);

      // Create new recipe
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: finalUserId,
          name: recipeData.name,
          description: recipeData.description,
          cuisine_type: recipeData.cuisine_type,
          difficulty: recipeData.difficulty,
          prep_time: recipeData.prep_time,
          cook_time: recipeData.cook_time,
          total_time: recipeData.prep_time + recipeData.cook_time,
          servings: recipeData.servings,
          ingredients: recipeData.ingredients,
          instructions: recipeData.instructions,
          calories: recipeData.nutrition.calories,
          protein: recipeData.nutrition.protein,
          carbs: recipeData.nutrition.carbs,
          fat: recipeData.nutrition.fat,
          fiber: recipeData.nutrition.fiber,
          tags: recipeData.tags,
          source: 'ai_generated',
          is_public: false,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Update meal plan item
      const { error: updateError } = await supabase
        .from('meal_plan_items')
        .update({ recipe_id: newRecipe.id, updated_at: new Date().toISOString() })
        .eq('id', itemIdToReplace);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Comida reemplazada con éxito' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate full weekly plan
    const snackPreference = userProfile.snack_preference || '3meals';
    const dietType = userProfile.diet_type || 'casera_normal';
    const mealDistribution = calculateMealDistribution(
      userProfile.daily_calorie_goal || 2000,
      snackPreference
    );
    const macroDistribution = getDietMacroDistribution(dietType);

    // Get meal types based on snack preference
    const mealTypes = Object.keys(mealDistribution);

    // Create or find meal plan
    const weekEndDate = new Date(finalWeekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    let existingPlan = mealPlanId;
    if (!existingPlan) {
      // First, check if a plan already exists for this user and week
      const { data: existingMealPlan } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', finalUserId)
        .eq('week_start_date', finalWeekStart)
        .single();

      if (existingMealPlan) {
        // Use existing plan
        console.log('Found existing meal plan:', existingMealPlan.id);
        existingPlan = existingMealPlan.id;
      } else {
        // Create new plan
        const { data: newPlan, error: planError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: finalUserId,
            name: `Plan Semanal ${finalWeekStart}`,
            week_start_date: finalWeekStart,
            week_end_date: weekEndDate.toISOString().split('T')[0],
            is_active: true,
          })
          .select()
          .single();

        if (planError) throw planError;
        existingPlan = newPlan.id;
      }
    }

    let mealsGenerated = 0;

    // Track previously generated meals by meal type for variety
    const generatedMealsByType: Record<string, string[]> = {};
    for (const mt of mealTypes) {
      generatedMealsByType[mt] = [];
    }

    // Generate meals for each day and meal type
    // Start from startDayOffset (0 = Monday, 6 = Sunday)
    for (let day = startDayOffset; day < startDayOffset + daysToGenerate; day++) {
      const currentDate = new Date(finalWeekStart);
      currentDate.setDate(currentDate.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];

      for (const mealType of mealTypes) {
        const mealCalories = (mealDistribution as unknown as Record<string, number>)[mealType];
        const mealProtein = Math.round((mealCalories * macroDistribution.protein / 100) / 4);
        const mealCarbs = Math.round((mealCalories * macroDistribution.carbs / 100) / 4);
        const mealFat = Math.round((mealCalories * macroDistribution.fat / 100) / 9);

        // Pass previously generated meals for this meal type to ensure variety
        const previousMeals = generatedMealsByType[mealType] || [];
        console.log(`Generating ${mealType} for day ${day}. Previous meals for this type:`, previousMeals);
        const prompt = buildMealPrompt(userProfile, mealType, mealCalories, mealProtein, mealCarbs, mealFat, undefined, previousMeals);

        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Eres un chef experto. Responde SOLO con JSON válido.\n\n${prompt}` }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
            }),
          }
        );

        if (!aiResponse.ok) {
          console.error(`AI generation failed for ${mealType} on day ${day}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.candidates[0].content.parts[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(`Invalid JSON response for ${mealType} on day ${day}`);
          continue;
        }

        const recipeData = JSON.parse(jsonMatch[0]);

        // Add meal name to tracker for variety in subsequent days
        if (recipeData.name) {
          generatedMealsByType[mealType].push(recipeData.name);
        }

        // Create recipe
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            user_id: finalUserId,
            name: recipeData.name,
            description: recipeData.description,
            cuisine_type: recipeData.cuisine_type,
            difficulty: recipeData.difficulty,
            prep_time: recipeData.prep_time,
            cook_time: recipeData.cook_time,
            total_time: recipeData.prep_time + recipeData.cook_time,
            servings: recipeData.servings,
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
            calories: recipeData.nutrition.calories,
            protein: recipeData.nutrition.protein,
            carbs: recipeData.nutrition.carbs,
            fat: recipeData.nutrition.fat,
            fiber: recipeData.nutrition.fiber,
            tags: recipeData.tags,
            source: 'ai_generated',
            is_public: false,
          })
          .select()
          .single();

        if (recipeError) {
          console.error('Error creating recipe:', recipeError);
          continue;
        }

        // Create meal plan item
        await supabase
          .from('meal_plan_items')
          .insert({
            meal_plan_id: existingPlan,
            recipe_id: recipe.id,
            day_of_week: day,
            meal_type: mealType,
            date: dateStr,
            is_completed: false,
          });

        mealsGenerated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        meal_plan_id: existingPlan,
        meals_generated: mealsGenerated
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating meal plan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
