import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { MealCard } from '@/components/MealCard';
import { RecipeDetailDialog } from '@/components/RecipeDetailDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight, Sparkles, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MEAL_TYPE_LABELS = {
  breakfast: 'Desayuno',
  mid_morning_snack: 'Snack AM',
  lunch: 'Almuerzo',
  afternoon_snack: 'Merienda',
  dinner: 'Cena',
};

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
  ingredients: unknown;
  instructions: unknown;
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

export function MealPlanner() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [snackPreference, setSnackPreference] = useState<string>('3meals');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        // Load snack preference
        supabase
          .from('user_profiles')
          .select('snack_preference')
          .eq('user_id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setSnackPreference((data as { snack_preference?: string }).snack_preference || '3meals');
          });
      }
    });
  }, []);

  const {
    mealPlan,
    mealPlanItems,
    loading,
    generating,
    weekStart,
    weekEnd,
    removeMeal,
    replaceMeal,
    generateWeeklyPlan,
    generateDailyPlan,
    toggleMealCompleted,
  } = useMealPlanner(userId || '', currentWeekDate);

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekDate(newDate);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekDate(newDate);
  };

  // Go to current week
  const goToCurrentWeek = () => {
    setCurrentWeekDate(new Date());
  };

  // Get meal for specific day/type
  const getMealForSlot = (dayIndex: number, mealType: string) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    const dateStr = date.toISOString().split('T')[0];

    return mealPlanItems.find(
      (item) => item.date === dateStr && item.meal_type === mealType
    );
  };

  // View recipe details
  const viewRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeDialog(true);
  };

  // Get active meal types based on snack preference
  const getActiveMealTypes = () => {
    switch (snackPreference) {
      case '3meals':
        return ['breakfast', 'lunch', 'dinner'] as const;
      case '4meals':
        return ['breakfast', 'mid_morning_snack', 'lunch', 'dinner'] as const;
      case '5meals':
        return ['breakfast', 'mid_morning_snack', 'lunch', 'afternoon_snack', 'dinner'] as const;
      default:
        return ['breakfast', 'lunch', 'dinner'] as const;
    }
  };

  const activeMealTypes = getActiveMealTypes();

  // Handle meal replacement
  const handleReplaceMeal = async (mealItemId: string, dayIndex: number, mealType: string) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    const dateStr = date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    toast.promise(
      replaceMeal(mealItemId, mealType),
      {
        loading: `Reemplazando ${MEAL_TYPE_LABELS[mealType as keyof typeof MEAL_TYPE_LABELS]} del ${dateStr}...`,
        success: 'Comida reemplazada con éxito',
        error: 'Error al reemplazar la comida',
      }
    );
  };

  if (!userId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-12 md:pl-0">
          <div>
            <h1 className="text-3xl font-serif font-bold">Planificador Semanal</h1>
            <p className="text-muted-foreground mt-1">
              {weekStart.toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })} -{' '}
              {weekEnd.toLocaleDateString('es-AR', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button variant="outline" onClick={goToCurrentWeek}>
              Hoy
            </Button>
            <Button variant="outline" onClick={goToNextWeek}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button onClick={() => generateDailyPlan()} disabled={generating} variant="outline" className="gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar Hoy
                </>
              )}
            </Button>
            <Button onClick={generateWeeklyPlan} disabled={generating} className="gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar Semana
                </>
              )}
            </Button>
            <Button variant="secondary" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Lista de Compras
            </Button>
          </div>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {DAYS_OF_WEEK.map((dayName, dayIndex) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + dayIndex);
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <Card
                key={dayIndex}
                className={isToday ? 'border-primary shadow-md' : ''}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{dayName}</span>
                    <span className={`text-xs ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {date.getDate()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-3 pt-0">
                  {activeMealTypes.map((mealType) => {
                    const mealItem = getMealForSlot(dayIndex, mealType);
                    return (
                      <div key={mealType}>
                        <MealCard
                          recipe={mealItem?.recipe || null}
                          mealType={mealType}
                          isCompleted={mealItem?.is_completed}
                          onRemove={
                            mealItem
                              ? () => removeMeal(mealItem.id)
                              : undefined
                          }
                          onViewDetails={
                            mealItem?.recipe
                              ? () => viewRecipeDetails(mealItem.recipe)
                              : undefined
                          }
                          onToggleCompleted={
                            mealItem
                              ? (completed) => toggleMealCompleted(mealItem.id, completed)
                              : undefined
                          }
                          onReplace={
                            mealItem
                              ? () => handleReplaceMeal(mealItem.id, dayIndex, mealType)
                              : undefined
                          }
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {mealPlanItems.length === 0 && !loading && (
          <Card className="mt-8">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                No tienes comidas planificadas esta semana
              </h3>
              <p className="text-muted-foreground mb-6">
                Genera un plan semanal completo con IA o agrega comidas manualmente
              </p>
              <Button onClick={generateWeeklyPlan} disabled={generating} size="lg" className="gap-2">
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generando Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generar Plan Semanal
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recipe Detail Dialog */}
      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={showRecipeDialog}
        onOpenChange={setShowRecipeDialog}
      />
    </div>
  );
}

export default MealPlanner;
