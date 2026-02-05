import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useSubscription } from '@/hooks/useSubscription';
import { MealCard } from '@/components/MealCard';
import { RecipeDetailDialog } from '@/components/RecipeDetailDialog';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { RenewalBanner } from '@/components/RenewalBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, ChevronLeft, ChevronRight, Sparkles, ShoppingCart, Lock, Download } from 'lucide-react';
import { toast } from 'sonner';

// Dynamic day names based on actual day of week
const DAY_NAMES: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

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
  const [showShoppingListPopover, setShowShoppingListPopover] = useState(false);
  const hasAutoNavigated = useRef(false);

  // Subscription hook
  const {
    subscribed,
    plan,
    loading: subLoading,
    getMealPlanningDateRange,
    canGenerateMealPlanForDate,
    canGenerateWeekPlan,
    createCheckout,
    openCustomerPortal,
    currentPeriodStart
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

  // Auto-navigate to today when subscription loads
  // The useMealPlanner hook will calculate the correct 7-day period based on subscription start
  useEffect(() => {
    if (subscribed && currentPeriodStart && !subLoading && !hasAutoNavigated.current) {
      // Navigate to today - the hook will calculate the correct period
      setCurrentWeekDate(new Date());
      hasAutoNavigated.current = true;
    }
  }, [subscribed, currentPeriodStart, subLoading]);

  // Parse subscription start date for subscription-based week calculation
  const subscriptionStartDate = currentPeriodStart ? new Date(currentPeriodStart) : undefined;

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
  } = useMealPlanner(userId || '', currentWeekDate, subscribed ? subscriptionStartDate : undefined);

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
    if (!subscribed || !canGenerateWeekPlan(weekStart, weekEnd)) {
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

  // Generate and download/print shopping list
  const handleDownloadShoppingList = () => {
    if (mealPlanItems.length === 0) return;

    // Collect all ingredients from meal plan items
    const ingredientsMap = new Map<string, { amount: number; unit: string; recipes: string[] }>();

    mealPlanItems.forEach((item) => {
      if (item.recipe?.ingredients) {
        const ingredients = Array.isArray(item.recipe.ingredients)
          ? item.recipe.ingredients
          : [];

        ingredients.forEach((ing: { name?: string; amount?: number; unit?: string }) => {
          if (ing.name) {
            const key = `${ing.name.toLowerCase()}-${ing.unit || ''}`;
            const existing = ingredientsMap.get(key);
            if (existing) {
              existing.amount += ing.amount || 0;
              if (!existing.recipes.includes(item.recipe.name)) {
                existing.recipes.push(item.recipe.name);
              }
            } else {
              ingredientsMap.set(key, {
                amount: ing.amount || 0,
                unit: ing.unit || '',
                recipes: [item.recipe.name],
              });
            }
          }
        });
      }
    });

    // Create printable HTML
    const dateRange = `${weekStart.toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('es-AR', { month: 'long', day: 'numeric', year: 'numeric' })}`;

    const ingredientsList = Array.from(ingredientsMap.entries())
      .map(([key, value]) => {
        const name = key.split('-')[0];
        return `<li style="margin-bottom: 8px;">
          <strong>${name.charAt(0).toUpperCase() + name.slice(1)}</strong>
          ${value.amount ? ` - ${value.amount} ${value.unit}` : ''}
          <br><small style="color: #666;">Para: ${value.recipes.join(', ')}</small>
        </li>`;
      })
      .join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lista de Compras - ${dateRange}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #0f9b6d; border-bottom: 2px solid #0f9b6d; padding-bottom: 10px; }
            h2 { color: #666; font-weight: normal; margin-top: -5px; }
            ul { list-style-type: none; padding: 0; }
            li { padding: 8px 0; border-bottom: 1px solid #eee; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Lista de Compras</h1>
          <h2>${dateRange}</h2>
          <ul>${ingredientsList}</ul>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }

    setShowShoppingListPopover(false);
    toast.success('Lista de compras generada');
  };

  // Check if shopping list can be generated
  const canGenerateShoppingList = mealPlanItems.length > 0;

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
        {/* Renewal Banner */}
        <RenewalBanner />

        {/* Subscription Status Banners */}
        {!subscribed && (
          <Alert variant="destructive" className="py-2 md:py-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 flex-shrink-0" />
              <AlertDescription className="text-sm">
                <span className="hidden sm:inline">El planificador de comidas requiere una suscripción activa. </span>
                <span className="sm:hidden">Suscripción requerida. </span>
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="underline font-medium hover:no-underline"
                >
                  Ver planes
                </button>
              </AlertDescription>
            </div>
          </Alert>
        )}

        {subscribed && planningRange && (
          <Alert className="py-2 md:py-3">
            <AlertDescription className="text-xs md:text-sm">
              <span className="font-medium">{plan === 'weekly' ? 'Plan Semanal' : 'Plan Mensual'}</span>
              <span className="hidden sm:inline">: Puedes planificar hasta el{' '}
                {new Date(planningRange.endDate).toLocaleDateString('es-AR')}
              </span>
              {' '}
              <span className="text-primary font-medium">({planningRange.daysRemaining} días)</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="space-y-4">
          {/* Title and Date */}
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-serif font-bold">Planificador Semanal</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              {weekStart.toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })} -{' '}
              {weekEnd.toLocaleDateString('es-AR', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek} className="flex-1 md:flex-none">
              <ChevronLeft className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Anterior</span>
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek} className="flex-1 md:flex-none">
              <span className="hidden md:inline">Siguiente</span>
              <ChevronRight className="h-4 w-4 md:ml-1" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
            <Button
              onClick={handleGenerateDaily}
              disabled={generating || !subscribed || !canGenerateMealPlanForDate(new Date())}
              variant="outline"
              size="sm"
              className="gap-1 md:gap-2 text-xs md:text-sm"
            >
              {!subscribed && <Lock className="h-3 w-3 md:h-4 md:w-4" />}
              {generating ? (
                <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="hidden sm:inline">Generar</span> Hoy
            </Button>
            <Button
              onClick={handleGenerateWeekly}
              disabled={generating || !subscribed || !canGenerateWeekPlan(weekStart, weekEnd)}
              size="sm"
              className="gap-1 md:gap-2 text-xs md:text-sm"
            >
              {!subscribed && <Lock className="h-3 w-3 md:h-4 md:w-4" />}
              {generating ? (
                <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="hidden sm:inline">Generar</span> Semana
            </Button>
            {/* Desktop: Tooltip + Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild className="hidden md:flex">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGenerateShoppingList}
                    onClick={handleDownloadShoppingList}
                    className="gap-1 md:gap-2 text-xs md:text-sm col-span-2 md:col-span-1 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary disabled:border-muted disabled:text-muted-foreground"
                  >
                    <ShoppingCart className="h-3 w-3 md:h-4 md:w-4" />
                    Lista de Compras
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Descarga los ingredientes de tu dieta en PDF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Mobile: Popover + Button */}
            <Popover open={showShoppingListPopover} onOpenChange={setShowShoppingListPopover}>
              <PopoverTrigger asChild className="md:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGenerateShoppingList}
                  className="gap-1 text-xs col-span-2 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary disabled:border-muted disabled:text-muted-foreground"
                >
                  <ShoppingCart className="h-3 w-3" />
                  Lista de Compras
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Descarga los ingredientes de tu dieta semanal en formato PDF para llevar al supermercado.
                  </p>
                  <Button
                    onClick={handleDownloadShoppingList}
                    className="w-full gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + dayIndex);
            const isToday = new Date().toDateString() === date.toDateString();
            const dayName = DAY_NAMES[date.getDay()];

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
              <Button
                onClick={handleGenerateWeekly}
                disabled={generating || !subscribed || !canGenerateWeekPlan(weekStart, weekEnd)}
                size="lg"
                className="gap-2"
              >
                {!subscribed && <Lock className="h-5 w-5" />}
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
