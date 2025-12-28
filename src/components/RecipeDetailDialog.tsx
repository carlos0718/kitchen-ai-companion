import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Clock, Users, TrendingUp, RefreshCw, Send, X as XIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import * as React from 'react';

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
}

interface RecipeDetailDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType?: 'breakfast' | 'mid_morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner';
  onReplace?: (preferences?: string) => void;
}

const MEAL_TYPE_LABELS = {
  breakfast: 'Desayuno',
  mid_morning_snack: 'Snack AM',
  lunch: 'Almuerzo',
  afternoon_snack: 'Merienda',
  dinner: 'Cena',
};

const MEAL_TYPE_COLORS = {
  breakfast: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  mid_morning_snack: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  lunch: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  afternoon_snack: 'bg-green-500/10 text-green-700 border-green-500/20',
  dinner: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
};

export function RecipeDetailDialog({ recipe, open, onOpenChange, mealType, onReplace }: RecipeDetailDialogProps) {
  const [showRegenerateInput, setShowRegenerateInput] = React.useState(false);
  const [regeneratePreferences, setRegeneratePreferences] = React.useState('');

  if (!recipe) return null;

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : [];
  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : [];

  const handleRegenerate = () => {
    if (onReplace) {
      onReplace(regeneratePreferences.trim() || undefined);
      setShowRegenerateInput(false);
      setRegeneratePreferences('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          {/* Header Image */}
          {recipe.image_url ? (
            <div className="relative h-64 w-full overflow-hidden">
              <img
                src={recipe.image_url}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-64 w-full bg-gradient-to-br from-primary/5 to-primary/20 flex items-center justify-center">
              <span className="text-7xl">🍽️</span>
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Title & Metadata */}
            <DialogHeader>
              <div className="flex flex-wrap gap-2 mb-3">
                {/* Meal Type Badge - Highlighted */}
                {mealType && (
                  <Badge variant="outline" className={MEAL_TYPE_COLORS[mealType]}>
                    {MEAL_TYPE_LABELS[mealType]}
                  </Badge>
                )}
                {recipe.difficulty && (
                  <Badge variant="secondary" className="capitalize">
                    {recipe.difficulty}
                  </Badge>
                )}
                {recipe.cuisine_type && (
                  <Badge variant="outline">{recipe.cuisine_type}</Badge>
                )}
                {recipe.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
                  {recipe.description && (
                    <DialogDescription className="text-base mt-2">
                      {recipe.description}
                    </DialogDescription>
                  )}
                </div>
                {onReplace && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowRegenerateInput(!showRegenerateInput)}
                    className="gap-2 flex-shrink-0 bg-primary hover:bg-primary/90"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerar
                  </Button>
                )}
              </div>

              {/* Regenerate Input */}
              {showRegenerateInput && onReplace && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">Personaliza tu nueva comida</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Especifica qué quieres cambiar o qué tipo de dieta prefieres (opcional)
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setShowRegenerateInput(false);
                        setRegeneratePreferences('');
                      }}
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Ej: Quiero algo más ligero, Sin gluten, Con más proteína, Vegano, etc."
                    value={regeneratePreferences}
                    onChange={(e) => setRegeneratePreferences(e.target.value)}
                    className="min-h-[80px] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowRegenerateInput(false);
                        setRegeneratePreferences('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRegenerate}
                      className="flex-1 gap-2"
                    >
                      <Send className="h-3 w-3" />
                      Generar Nueva Comida
                    </Button>
                  </div>
                </div>
              )}
            </DialogHeader>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              {recipe.prep_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Preparación</p>
                    <p className="font-semibold">{recipe.prep_time} min</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Porciones</p>
                  <p className="font-semibold">{recipe.servings}</p>
                </div>
              </div>
              {recipe.calories && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Calorías</p>
                    <p className="font-semibold">{recipe.calories} kcal</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Nutritional Info */}
            {(recipe.protein || recipe.carbs || recipe.fat) && (
              <>
                <div>
                  <h3 className="font-semibold mb-3">Información Nutricional (por porción)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recipe.calories && (
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-primary">{recipe.calories}</p>
                        <p className="text-xs text-muted-foreground">Calorías</p>
                      </div>
                    )}
                    {recipe.protein && (
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{recipe.protein}g</p>
                        <p className="text-xs text-muted-foreground">Proteínas</p>
                      </div>
                    )}
                    {recipe.carbs && (
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-orange-600">{recipe.carbs}g</p>
                        <p className="text-xs text-muted-foreground">Carbohidratos</p>
                      </div>
                    )}
                    {recipe.fat && (
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-purple-600">{recipe.fat}g</p>
                        <p className="text-xs text-muted-foreground">Grasas</p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Ingredients */}
            {ingredients.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Ingredientes</h3>
                <ul className="space-y-2">
                  {ingredients.map((ingredient: any, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span>
                        {ingredient.amount && ingredient.unit
                          ? `${ingredient.amount} ${ingredient.unit} de `
                          : ''}
                        {ingredient.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {instructions.length > 0 && <Separator />}

            {/* Instructions */}
            {instructions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Instrucciones</h3>
                <ol className="space-y-3">
                  {instructions.map((instruction: any, index: number) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {instruction.step || index + 1}
                      </span>
                      <p className="text-sm pt-0.5">{instruction.description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
