import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { useSubscription } from '@/hooks/useSubscription';
import { MealCell } from '@/components/MealCell';
import { RecipeDetailDialog } from '@/components/RecipeDetailDialog';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { RenewalBanner } from '@/components/RenewalBanner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Loader2, ChevronLeft, ChevronRight, Sparkles,
  ShoppingCart, Lock, Download, Coffee, Sun, Utensils, Cookie, Moon,
} from 'lucide-react';
import { toast } from 'sonner';

const DAY_SHORT: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
};

const MEAL_ROWS = [
  { key: 'breakfast',       label: 'Desayuno',  Icon: Coffee, color: 'text-orange-500' },
  { key: 'mid_morning_snack', label: 'Snack AM', Icon: Cookie, color: 'text-yellow-500' },
  { key: 'lunch',           label: 'Almuerzo',  Icon: Utensils, color: 'text-blue-500' },
  { key: 'afternoon_snack', label: 'Merienda',  Icon: Sun,    color: 'text-green-500' },
  { key: 'dinner',          label: 'Cena',      Icon: Moon,   color: 'text-purple-500' },
] as const;

type MealKey = typeof MEAL_ROWS[number]['key'];

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

  const {
    subscribed, plan, loading: subLoading,
    getMealPlanningDateRange, canGenerateMealPlanForDate, canGenerateWeekPlan,
    createCheckout, openCustomerPortal, currentPeriodStart,
  } = useSubscription();

  const planningRange = getMealPlanningDateRange();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
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

  useEffect(() => {
    if (subscribed && currentPeriodStart && !subLoading && !hasAutoNavigated.current) {
      setCurrentWeekDate(new Date());
      hasAutoNavigated.current = true;
    }
  }, [subscribed, currentPeriodStart, subLoading]);

  const subscriptionStartDate = currentPeriodStart ? new Date(currentPeriodStart) : undefined;

  const {
    mealPlanItems, loading, generating,
    weekStart, weekEnd,
    removeMeal, replaceMeal, generateWeeklyPlan, generateDailyPlan, toggleMealCompleted,
  } = useMealPlanner(userId || '', currentWeekDate, subscribed ? subscriptionStartDate : undefined);

  const goToPreviousWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() - 7);
    setCurrentWeekDate(d);
  };

  const goToNextWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() + 7);
    setCurrentWeekDate(d);
  };

  const goToCurrentWeek = () => setCurrentWeekDate(new Date());

  const getMealForSlot = (dayIndex: number, mealType: string) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    const dateStr = date.toISOString().split('T')[0];
    return mealPlanItems.find((item) => item.date === dateStr && item.meal_type === mealType);
  };

  const viewRecipeDetails = (recipe: Recipe, mealItemId?: string, mealType?: string, dayIndex?: number) => {
    setSelectedRecipe(recipe);
    setSelectedMealItem(mealItemId && mealType && dayIndex !== undefined ? { id: mealItemId, mealType, dayIndex } : null);
    setShowRecipeDialog(true);
  };

  const getActiveMealTypes = (): MealKey[] => {
    switch (snackPreference) {
      case '4meals': return ['breakfast', 'mid_morning_snack', 'lunch', 'dinner'];
      case '5meals': return ['breakfast', 'mid_morning_snack', 'lunch', 'afternoon_snack', 'dinner'];
      default:       return ['breakfast', 'lunch', 'dinner'];
    }
  };

  const activeMealTypes = getActiveMealTypes();
  const activeRows = MEAL_ROWS.filter((r) => activeMealTypes.includes(r.key));

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

  const handleReplaceMeal = async (mealItemId: string, dayIndex: number, mealType: string, preferences?: string) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    if (!subscribed || !canGenerateMealPlanForDate(date)) {
      setShowSubscriptionModal(true);
      toast.error('Fecha fuera de tu período de suscripción');
      return;
    }
    try {
      toast.promise(replaceMeal(mealItemId, mealType, preferences), {
        loading: preferences ? 'Generando nueva comida...' : 'Reemplazando comida...',
        success: 'Comida reemplazada',
        error: 'Error al reemplazar',
      });
    } catch (error: unknown) {
      if (error instanceof Error && (error.message === 'SUBSCRIPTION_REQUIRED' || error.message?.startsWith('PERIOD_EXCEEDED:'))) {
        setShowSubscriptionModal(true);
      }
    }
  };

  const handleDownloadShoppingList = () => {
    if (mealPlanItems.length === 0) return;
    const ingredientsMap = new Map<string, { amount: number; unit: string; recipes: string[] }>();
    mealPlanItems.forEach((item) => {
      if (item.recipe?.ingredients) {
        const ingredients = Array.isArray(item.recipe.ingredients) ? item.recipe.ingredients : [];
        ingredients.forEach((ing: { name?: string; amount?: number; unit?: string }) => {
          if (ing.name) {
            const key = `${ing.name.toLowerCase()}-${ing.unit || ''}`;
            const existing = ingredientsMap.get(key);
            if (existing) {
              existing.amount += ing.amount || 0;
              if (!existing.recipes.includes(item.recipe.name)) existing.recipes.push(item.recipe.name);
            } else {
              ingredientsMap.set(key, { amount: ing.amount || 0, unit: ing.unit || '', recipes: [item.recipe.name] });
            }
          }
        });
      }
    });
    const dateRange = `${weekStart.toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('es-AR', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    const ingredientsList = Array.from(ingredientsMap.entries())
      .map(([key, value]) => {
        const name = key.split('-')[0];
        return `<li style="margin-bottom:8px"><strong>${name.charAt(0).toUpperCase() + name.slice(1)}</strong>${value.amount ? ` — ${value.amount} ${value.unit}` : ''}<br><small style="color:#666">Para: ${value.recipes.join(', ')}</small></li>`;
      }).join('');
    const printContent = `<!DOCTYPE html><html><head><title>Lista de Compras - ${dateRange}</title><style>body{font-family:'Segoe UI',sans-serif;padding:20px;max-width:800px;margin:0 auto}h1{color:#0f9b6d;border-bottom:2px solid #0f9b6d;padding-bottom:10px}ul{list-style:none;padding:0}li{padding:8px 0;border-bottom:1px solid #eee}@media print{body{padding:0}}</style></head><body><h1>Lista de Compras</h1><h2>${dateRange}</h2><ul>${ingredientsList}</ul></body></html>`;
    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) w.onload = () => { w.print(); URL.revokeObjectURL(url); };
    setShowShoppingListPopover(false);
    toast.success('Lista de compras generada');
  };

  // Build array of 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const isToday = new Date().toDateString() === date.toDateString();
    return { date, isToday, dayName: DAY_SHORT[date.getDay()], dayNum: date.getDate() };
  });

  if (!userId || loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <RenewalBanner />

        {/* Banners */}
        {!subscribed && (
          <Alert variant="destructive" className="py-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 flex-shrink-0" />
              <AlertDescription className="text-sm">
                El planificador requiere una suscripción activa.{' '}
                <button onClick={() => setShowSubscriptionModal(true)} className="underline font-medium hover:no-underline">
                  Ver planes
                </button>
              </AlertDescription>
            </div>
          </Alert>
        )}

        {subscribed && planningRange && (
          <Alert className="py-2">
            <AlertDescription className="text-xs md:text-sm">
              <span className="font-medium">{plan === 'weekly' ? 'Plan Semanal' : 'Plan Mensual'}</span>
              <span className="hidden sm:inline">: Puedes planificar hasta el {new Date(planningRange.endDate).toLocaleDateString('es-AR')}</span>
              {' '}<span className="text-primary font-medium">({planningRange.daysRemaining} días)</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold">Planificador Semanal</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
              {' — '}
              {weekEnd.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Navigation */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 px-3 md:h-7 md:px-2 text-xs font-medium" onClick={goToCurrentWeek}>
                Hoy
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Generate buttons */}
            <Button
              onClick={handleGenerateDaily}
              disabled={generating || !subscribed || !canGenerateMealPlanForDate(new Date())}
              variant="outline" size="sm"
              className="gap-1.5 h-8 text-xs"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Hoy
            </Button>

            <Button
              onClick={handleGenerateWeekly}
              disabled={generating || !subscribed || !canGenerateWeekPlan(weekStart, weekEnd)}
              size="sm" className="gap-1.5 h-8 text-xs"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Semana
            </Button>

            {/* Shopping list — desktop tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild className="hidden md:flex">
                  <Button
                    variant="outline" size="sm"
                    disabled={mealPlanItems.length === 0}
                    onClick={handleDownloadShoppingList}
                    className="gap-1.5 h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary disabled:border-muted disabled:text-muted-foreground"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Compras
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Genera tu lista de compras</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Shopping list — mobile popover */}
            <Popover open={showShoppingListPopover} onOpenChange={setShowShoppingListPopover}>
              <PopoverTrigger asChild className="md:hidden">
                <Button
                  variant="outline" size="sm"
                  disabled={mealPlanItems.length === 0}
                  className="gap-1.5 h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary disabled:border-muted disabled:text-muted-foreground"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Compras
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <p className="text-sm text-muted-foreground mb-3">Lista de ingredientes de la semana en PDF.</p>
                <Button onClick={handleDownloadShoppingList} className="w-full gap-2" size="sm">
                  <Download className="h-4 w-4" /> Descargar PDF
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ─── Calendar Grid ─── */}
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <div className="min-w-[640px]">

            {/* Day headers */}
            <div className="grid border-b" style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}>
              <div className="p-3 border-r" /> {/* corner */}
              {days.map(({ date, isToday, dayName, dayNum }) => (
                <div
                  key={dayNum}
                  className={cn(
                    'p-3 text-center border-r last:border-r-0',
                    isToday ? 'bg-primary/5' : ''
                  )}
                >
                  <p className={cn('text-xs font-medium uppercase tracking-wide', isToday ? 'text-primary' : 'text-muted-foreground')}>
                    {dayName}
                  </p>
                  <div className={cn(
                    'mt-1 mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  )}>
                    {dayNum}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {date.toLocaleDateString('es-AR', { month: 'short' })}
                  </p>
                </div>
              ))}
            </div>

            {/* Meal rows */}
            {activeRows.map(({ key, label, Icon, color }, rowIdx) => (
              <div
                key={key}
                className={cn(
                  'grid',
                  rowIdx < activeRows.length - 1 ? 'border-b' : ''
                )}
                style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}
              >
                {/* Row header */}
                <div className="p-3 border-r flex flex-col items-center justify-center gap-1 bg-muted/30">
                  <Icon className={cn('h-4 w-4', color)} />
                  <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">{label}</span>
                </div>

                {/* Day cells */}
                {days.map(({ dayNum, isToday }, dayIndex) => {
                  const mealItem = getMealForSlot(dayIndex, key);
                  return (
                    <div
                      key={`${key}-${dayNum}`}
                      className={cn(
                        'border-r last:border-r-0 p-2 min-h-[130px]',
                        isToday ? 'bg-primary/5' : ''
                      )}
                    >
                      <MealCell
                        recipe={mealItem?.recipe || null}
                        mealType={key}
                        isCompleted={mealItem?.is_completed}
                        onRemove={mealItem ? () => removeMeal(mealItem.id) : undefined}
                        onViewDetails={
                          mealItem?.recipe
                            ? () => viewRecipeDetails(mealItem.recipe, mealItem.id, key, dayIndex)
                            : undefined
                        }
                        onToggleCompleted={mealItem ? (c) => toggleMealCompleted(mealItem.id, c) : undefined}
                        onReplace={mealItem ? () => handleReplaceMeal(mealItem.id, dayIndex, key) : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {mealPlanItems.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Sin comidas planificadas esta semana</h3>
            <p className="text-muted-foreground text-sm mb-5">Genera un plan semanal con IA o agrega comidas manualmente</p>
            <Button
              onClick={handleGenerateWeekly}
              disabled={generating || !subscribed || !canGenerateWeekPlan(weekStart, weekEnd)}
              className="gap-2"
            >
              {!subscribed && <Lock className="h-4 w-4" />}
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</> : <><Sparkles className="h-4 w-4" /> Generar Plan Semanal</>}
            </Button>
          </div>
        )}
      </div>

      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={showRecipeDialog}
        onOpenChange={setShowRecipeDialog}
        mealType={selectedMealItem?.mealType as 'breakfast' | 'mid_morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner'}
        onReplace={
          selectedMealItem
            ? (preferences?: string) => handleReplaceMeal(selectedMealItem.id, selectedMealItem.dayIndex, selectedMealItem.mealType, preferences)
            : undefined
        }
      />

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
