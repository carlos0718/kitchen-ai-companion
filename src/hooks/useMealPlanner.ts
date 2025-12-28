import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MealPlan {
  id: string;
  user_id: string;
  name: string;
  week_start_date: string;
  week_end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  recipe_id: string | null;
  day_of_week: number;
  meal_type: 'breakfast' | 'mid_morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner';
  date: string;
  custom_servings: number | null;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  recipe?: Recipe;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  cuisine_type: string | null;
  difficulty: string | null;
  prep_time: number | null;
  cook_time: number | null;
  total_time: number | null;
  servings: number;
  ingredients: any;
  instructions: any;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  tags: string[];
  image_url: string | null;
  source: string;
  is_public: boolean;
}

// Helper to get week start/end dates
function getWeekDates(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function useMealPlanner(userId: string, weekDate: Date = new Date()) {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [mealPlanItems, setMealPlanItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const { start: weekStart, end: weekEnd } = getWeekDates(weekDate);

  // Load or create meal plan for the week
  const loadMealPlan = async () => {
    setLoading(true);
    try {
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      console.log('🔍 loadMealPlan searching for:', {
        userId,
        weekStartStr,
        weekEndStr,
        weekStart,
        weekEnd
      });

      // Check if meal plan exists for this week
      let { data: existingPlan, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartStr)
        .single();

      console.log('🔍 Meal plan query result:', { existingPlan, planError });

      // If doesn't exist, create it
      if (planError && planError.code === 'PGRST116') {
        const { data: newPlan, error: createError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userId,
            week_start_date: weekStartStr,
            week_end_date: weekEndStr,
            name: `Plan Semanal ${weekStartStr}`,
          })
          .select()
          .single();

        if (createError) throw createError;
        existingPlan = newPlan;
      } else if (planError) {
        throw planError;
      }

      setMealPlan(existingPlan);

      // Load meal plan items with recipes
      if (existingPlan) {
        console.log('🔍 Loading meal items for plan:', existingPlan.id);

        const { data: items, error: itemsError } = await supabase
          .from('meal_plan_items')
          .select(`
            *,
            recipe:recipes(*)
          `)
          .eq('meal_plan_id', existingPlan.id)
          .order('date', { ascending: true })
          .order('meal_type', { ascending: true });

        console.log('🔍 Meal items query result:', { items, itemsError, count: items?.length });

        if (itemsError) throw itemsError;
        setMealPlanItems(items || []);
      } else {
        console.log('⚠️ No meal plan found, items will be empty');
      }
    } catch (error: any) {
      console.error('Error loading meal plan:', error);
      toast.error('Error al cargar el plan de comidas');
    } finally {
      setLoading(false);
    }
  };

  // Add meal to a specific day/meal_type
  const addMealToDay = async (
    date: string,
    mealType: 'breakfast' | 'mid_morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner',
    recipeId: string
  ) => {
    if (!mealPlan) return;

    try {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();

      const { data, error } = await supabase
        .from('meal_plan_items')
        .insert({
          meal_plan_id: mealPlan.id,
          recipe_id: recipeId,
          day_of_week: dayOfWeek,
          meal_type: mealType,
          date: date,
        })
        .select(`
          *,
          recipe:recipes(*)
        `)
        .single();

      if (error) throw error;

      setMealPlanItems((prev) => [...prev, data]);
      toast.success('Comida agregada al plan');
    } catch (error: any) {
      console.error('Error adding meal:', error);
      toast.error('Error al agregar comida al plan');
    }
  };

  // Remove meal from plan
  const removeMeal = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('meal_plan_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setMealPlanItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success('Comida eliminada del plan');
    } catch (error: any) {
      console.error('Error removing meal:', error);
      toast.error('Error al eliminar comida');
    }
  };

  // Replace meal with AI-generated alternative
  const replaceMeal = async (mealItemId: string, mealType: string, preferences?: string) => {
    if (!userId || !mealPlan) return;

    try {
      setGenerating(true);

      // Get current item to know the date
      const currentItem = mealPlanItems.find(item => item.id === mealItemId);
      if (!currentItem) {
        toast.error('No se encontró la comida a reemplazar');
        return;
      }

      // Call edge function to generate ONE new meal
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: {
          userId,
          weekStart: currentItem.date,
          mealPlanId: mealPlan.id,
          singleMeal: true,
          mealType,
          dateToReplace: currentItem.date,
          itemIdToReplace: mealItemId,
          userPreferences: preferences, // User's custom preferences for regeneration
        },
      });

      if (error) {
        // Check if it's a subscription error
        if (error.message?.includes('subscription') || error.message?.includes('suscripción')) {
          throw new Error('SUBSCRIPTION_REQUIRED');
        }
        throw error;
      }

      toast.success('Comida reemplazada con éxito');
      await loadMealPlan(); // Reload the plan
    } catch (error: any) {
      console.error('Error replacing meal:', error);

      // Handle specific subscription errors
      if (error.message === 'SUBSCRIPTION_REQUIRED') {
        toast.error('Necesitas una suscripción activa para reemplazar comidas');
        throw error; // Re-throw for component to catch
      } else if (error.message.startsWith('PERIOD_EXCEEDED:')) {
        const message = error.message.replace('PERIOD_EXCEEDED: ', '');
        toast.error(message);
        throw error; // Re-throw for component to catch
      } else {
        toast.error('Error al reemplazar la comida');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Generate weekly plan with AI
  const generateWeeklyPlan = async () => {
    if (!mealPlan) return;

    setGenerating(true);
    try {
      toast.info('Generando plan semanal con IA...');

      const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meal-plan`;

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
          week_start_date: weekStart.toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const errorText = await response.text();
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        // Handle subscription-specific errors
        if (errorData.error === 'subscription_required') {
          throw new Error('SUBSCRIPTION_REQUIRED');
        } else if (errorData.error === 'date_after_period' || errorData.error === 'date_before_period') {
          throw new Error(`PERIOD_EXCEEDED: ${errorData.message}`);
        } else if (errorData.error === 'date_in_past') {
          throw new Error(`INVALID_DATE: ${errorData.message}`);
        } else if (errorData.error === 'invalid_subscription') {
          throw new Error(`INVALID_SUBSCRIPTION: ${errorData.message}`);
        } else {
          throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        toast.success(`¡Plan generado! ${data.meals_generated} comidas creadas`);
        // Reload meal plan to show new items
        await loadMealPlan();
      } else {
        throw new Error(data.error || 'Error al generar plan');
      }
    } catch (error: any) {
      console.error('Error generating plan:', error);

      // Handle specific subscription errors
      if (error.message === 'SUBSCRIPTION_REQUIRED') {
        toast.error('Necesitas una suscripción para el planificador');
        throw error; // Re-throw for component to catch
      } else if (error.message.startsWith('PERIOD_EXCEEDED:')) {
        const message = error.message.replace('PERIOD_EXCEEDED: ', '');
        toast.error(message);
        throw error; // Re-throw for component to catch
      } else if (error.message.startsWith('INVALID_DATE:')) {
        const message = error.message.replace('INVALID_DATE: ', '');
        toast.error(message);
      } else if (error.message.startsWith('INVALID_SUBSCRIPTION:')) {
        const message = error.message.replace('INVALID_SUBSCRIPTION: ', '');
        toast.error(message);
      } else {
        toast.error(error.message || 'Error al generar plan semanal');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Generate daily plan (1 day) with AI
  const generateDailyPlan = async (dateToGenerate?: Date) => {
    if (!mealPlan) {
      toast.error('No hay un plan de comidas activo');
      return;
    }

    setGenerating(true);
    try {
      const targetDate = dateToGenerate || new Date();
      const dateStr = targetDate.toISOString().split('T')[0];

      // IMPORTANT: Use weekStart (Monday) not the target date
      // This ensures we use the same meal_plan as loadMealPlan
      const weekStartStr = weekStart.toISOString().split('T')[0];

      // Calculate day offset from Monday (0 = Monday, 6 = Sunday)
      const dayOffset = Math.floor((targetDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));

      console.log('Generating daily plan with params:', {
        user_id: userId,
        week_start_date: weekStartStr,
        target_date: dateStr,
        dayOffset,
        daysToGenerate: 1,
      });

      toast.info('Generando plan para hoy con IA...');

      const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meal-plan`;

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
          week_start_date: weekStartStr, // Use Monday of the week
          startDayOffset: dayOffset, // Which day to start generating from (0-6)
          daysToGenerate: 1, // Generate only 1 day
        }),
      });

      console.log('Edge function response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const errorText = await response.text();
          console.error('Edge function error:', errorText);
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        // Handle subscription-specific errors
        if (errorData.error === 'subscription_required') {
          throw new Error('SUBSCRIPTION_REQUIRED');
        } else if (errorData.error === 'date_after_period' || errorData.error === 'date_before_period') {
          throw new Error(`PERIOD_EXCEEDED: ${errorData.message}`);
        } else if (errorData.error === 'date_in_past') {
          throw new Error(`INVALID_DATE: ${errorData.message}`);
        } else if (errorData.error === 'invalid_subscription') {
          throw new Error(`INVALID_SUBSCRIPTION: ${errorData.message}`);
        } else {
          throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('Edge function data:', data);

      if (data && data.success) {
        toast.success(`¡Plan generado! ${data.meals_generated} comidas creadas`);
        // Reload meal plan to show new items
        await loadMealPlan();
      } else {
        throw new Error(data?.error || 'Error desconocido al generar plan');
      }
    } catch (error: any) {
      console.error('Error generating daily plan:', error);

      // Handle specific subscription errors
      if (error.message === 'SUBSCRIPTION_REQUIRED') {
        toast.error('Necesitas una suscripción para el planificador');
        throw error; // Re-throw for component to catch
      } else if (error.message.startsWith('PERIOD_EXCEEDED:')) {
        const message = error.message.replace('PERIOD_EXCEEDED: ', '');
        toast.error(message);
        throw error; // Re-throw for component to catch
      } else if (error.message.startsWith('INVALID_DATE:')) {
        const message = error.message.replace('INVALID_DATE: ', '');
        toast.error(message);
      } else if (error.message.startsWith('INVALID_SUBSCRIPTION:')) {
        const message = error.message.replace('INVALID_SUBSCRIPTION: ', '');
        toast.error(message);
      } else {
        toast.error(error.message || 'Error al generar plan diario');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Mark meal as completed
  const toggleMealCompleted = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('meal_plan_items')
        .update({ is_completed: completed })
        .eq('id', itemId);

      if (error) throw error;

      setMealPlanItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, is_completed: completed } : item
        )
      );
    } catch (error: any) {
      console.error('Error updating meal:', error);
      toast.error('Error al actualizar comida');
    }
  };

  useEffect(() => {
    if (userId) {
      loadMealPlan();
    }
  }, [userId, weekDate]);

  return {
    mealPlan,
    mealPlanItems,
    loading,
    generating,
    weekStart,
    weekEnd,
    loadMealPlan,
    addMealToDay,
    removeMeal,
    replaceMeal,
    generateWeeklyPlan,
    generateDailyPlan,
    toggleMealCompleted,
  };
}
