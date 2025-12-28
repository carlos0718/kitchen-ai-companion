import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useSubscription } from '@/hooks/useSubscription';
import { MealCard } from '@/components/MealCard';
import { RecipeDetailDialog } from '@/components/RecipeDetailDialog';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ChevronLeft, ChevronRight, Sparkles, ShoppingCart, Lock } from 'lucide-react';
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
  const [selectedMealItem, setSelectedMealItem] = useState<{ id: string; mealType: string; dayIndex: number } | null>(null);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [snackPreference, setSnackPreference] = useState<string>('3meals');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Subscription hook
  const {
    subscribed,
    plan,
    loading: subLoading,
    getMealPlanningDateRange,
    canGenerateMealPlanForDate,
    createCheckout,
    openCustomerPortal
  } = useSubscription();

  const planningRange = getMealPlanningDateRange();

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
  const viewRecipeDetails = (recipe: Recipe, mealItemId?: string, mealType?: string, dayIndex?: number) => {
    setSelectedRecipe(recipe);
    if (mealItemId && mealType && dayIndex !== undefined) {
      setSelectedMealItem({ id: mealItemId, mealType, dayIndex });
    } else {
      setSelectedMealItem(null);
    }
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

  // Handle weekly plan generation with subscription check
  const handleGenerateWeekly = async () => {
    if (!subscribed || !canGenerateMealPlanForDate(weekStart)) {
      setShowSubscriptionModal(true);
      toast.error('Necesitas una suscripción activa');
      return;
    }

    try {
      await generateWeeklyPlan();
    } catch (error: unknown) {
      if (error instanceof Error && (error.message === 'SUBSCRIPTION_REQUIRED' || error.message?.startsWith('PERIOD_EXCEEDED:'))) {
        setShowSubscriptionModal(true);
      }
    }
  };

  // Handle daily plan generation with subscription check
  const handleGenerateDaily = async () => {
    const today = new Date();
    if (!subscribed || !canGenerateMealPlanForDate(today)) {
      setShowSubscriptionModal(true);
      toast.error('Fecha fuera de tu período de suscripción');
      return;
    }

    try {
      await generateDailyPlan();
    } catch (error: unknown) {
      if (error instanceof Error && (error.message === 'SUBSCRIPTION_REQUIRED' || error.message?.startsWith('PERIOD_EXCEEDED:'))) {
        setShowSubscriptionModal(true);
      }
    }
  };

  // Handle meal replacement
  const handleReplaceMeal = async (mealItemId: string, dayIndex: number, mealType: string, preferences?: string) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);

    // Check subscription for this specific date
    if (!subscribed || !canGenerateMealPlanForDate(date)) {
      setShowSubscriptionModal(true);
      toast.error('Fecha fuera de tu período de suscripción');
      return;
    }

    const dateStr = date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const loadingMessage = preferences
      ? `Generando nueva comida con tus preferencias...`
      : `Reemplazando ${MEAL_TYPE_LABELS[mealType as keyof typeof MEAL_TYPE_LABELS]} del ${dateStr}...`;

    try {
      toast.promise(
        replaceMeal(mealItemId, mealType, preferences),
        {
          loading: loadingMessage,
          success: 'Comida reemplazada con éxito',
          error: 'Error al reemplazar la comida',
        }
      );
    } catch (error: unknown) {
      if (error instanceof Error && (error.message === 'SUBSCRIPTION_REQUIRED' || error.message?.startsWith('PERIOD_EXCEEDED:'))) {
        setShowSubscriptionModal(true);
      }
    }
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
        {/* Subscription Status Banners */}
        {!subscribed && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              El planificador de comidas requiere una suscripción activa.{' '}
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="underline font-medium hover:no-underline"
              >
                Ver planes
              </button>
            </AlertDescription>
          </Alert>
        )}

        {subscribed && planningRange && (
          <Alert>
            <AlertDescription>
              Plan {plan === 'weekly' ? 'Semanal' : 'Mensual'}: Puedes planificar hasta el{' '}
              {new Date(planningRange.endDate).toLocaleDateString('es-AR')}
              {' '}({planningRange.daysRemaining} días restantes)
            </AlertDescription>
          </Alert>
        )}

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
            <Button
              onClick={handleGenerateDaily}
              disabled={generating || !subscribed || !canGenerateMealPlanForDate(new Date())}
              variant="outline"
              className="gap-2"
            >
              {!subscribed && <Lock className="h-4 w-4" />}
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
            <Button
              onClick={handleGenerateWeekly}
              disabled={generating || !subscribed || !canGenerateMealPlanForDate(weekStart)}
              className="gap-2"
            >
              {!subscribed && <Lock className="h-4 w-4" />}
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
                              ? () => viewRecipeDetails(mealItem.recipe, mealItem.id, mealType, dayIndex)
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
        mealType={selectedMealItem?.mealType as 'breakfast' | 'mid_morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner'}
        onReplace={
          selectedMealItem
            ? (preferences) => handleReplaceMeal(selectedMealItem.id, selectedMealItem.dayIndex, selectedMealItem.mealType, preferences)
            : undefined
        }
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        currentPlan={plan}
        onSubscribe={createCheckout}
        onManage={openCustomerPortal}
      />
    </div>
  );
}

export default MealPlanner;
