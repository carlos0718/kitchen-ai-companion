import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Eye, CheckCircle2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  image_url: string | null;
  prep_time: number | null;
  difficulty: string | null;
}

interface MealCardProps {
  recipe: Recipe | null;
  mealType: 'breakfast' | 'mid_morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'snack';
  isCompleted?: boolean;
  onRemove?: () => void;
  onViewDetails?: () => void;
  onToggleCompleted?: (completed: boolean) => void;
  onReplace?: () => void;
  onAddMeal?: () => void;
}

const MEAL_TYPE_LABELS = {
  breakfast: 'Desayuno',
  mid_morning_snack: 'Snack AM',
  lunch: 'Almuerzo',
  afternoon_snack: 'Merienda',
  dinner: 'Cena',
  snack: 'Snack',
};

const MEAL_TYPE_COLORS = {
  breakfast: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  mid_morning_snack: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  lunch: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  afternoon_snack: 'bg-green-500/10 text-green-700 border-green-500/20',
  dinner: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  snack: 'bg-green-500/10 text-green-700 border-green-500/20',
};

export function MealCard({
  recipe,
  mealType,
  isCompleted = false,
  onRemove,
  onViewDetails,
  onToggleCompleted,
  onReplace,
  onAddMeal,
}: MealCardProps) {
  const [imageError, setImageError] = useState(false);

  if (!recipe) {
    return (
      <Card
        className={`border-dashed border-2 ${onAddMeal ? 'cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors' : ''}`}
        onClick={onAddMeal}
      >
        <CardContent className="p-4 h-32 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            No hay comida asignada
            <br />
            <span className="text-xs">{onAddMeal ? 'Click para agregar' : ''}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden hover:shadow-md transition-shadow ${isCompleted ? 'opacity-60' : ''}`}>
      {/* Completed Badge */}
      {isCompleted && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="default" className="bg-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completado
          </Badge>
        </div>
      )}

      {/* Remove Button */}
      {onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 z-10 h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Image */}
      {recipe.image_url && !imageError ? (
        <div className="relative h-32 overflow-hidden bg-muted">
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-primary/5 to-primary/20 flex items-center justify-center">
          <span className="text-5xl">🍽️</span>
        </div>
      )}

      <CardContent className="p-3 space-y-2">
        {/* Meal Type Badge */}
        <Badge variant="outline" className={MEAL_TYPE_COLORS[mealType]}>
          {MEAL_TYPE_LABELS[mealType]}
        </Badge>

        {/* Recipe Name */}
        <h3 className="font-semibold text-sm line-clamp-2">{recipe.name}</h3>

        {/* Nutrition Summary */}
        {recipe.calories && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="font-medium">{recipe.calories} kcal</span>
            {recipe.protein && <span>P: {recipe.protein}g</span>}
            {recipe.carbs && <span>C: {recipe.carbs}g</span>}
            {recipe.fat && <span>G: {recipe.fat}g</span>}
          </div>
        )}

        {/* Metadata */}
        <div className="flex gap-2 text-xs text-muted-foreground">
          {recipe.prep_time && <span>⏱️ {recipe.prep_time}min</span>}
          {recipe.difficulty && (
            <span className="capitalize">• {recipe.difficulty}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={onViewDetails}
            >
              <Eye className="h-3 w-3" />
              Ver
            </Button>
          )}
          {onReplace && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 gap-1"
              onClick={onReplace}
            >
              <RefreshCw className="h-3 w-3" />
              Reemplazar
            </Button>
          )}
          {onToggleCompleted && (
            <Button
              variant={isCompleted ? 'outline' : 'default'}
              size="sm"
              className="flex-1"
              onClick={() => onToggleCompleted(!isCompleted)}
            >
              {isCompleted ? 'Pendiente' : 'Completar'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
