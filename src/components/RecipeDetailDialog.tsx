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
import { Clock, Users, TrendingUp } from 'lucide-react';

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
}

export function RecipeDetailDialog({ recipe, open, onOpenChange }: RecipeDetailDialogProps) {
  if (!recipe) return null;

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : [];
  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          {/* Header Image */}
          {recipe.image_url && (
            <div className="relative h-64 w-full overflow-hidden">
              <img
                src={recipe.image_url}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Title & Metadata */}
            <DialogHeader>
              <div className="flex flex-wrap gap-2 mb-3">
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
              <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
              {recipe.description && (
                <DialogDescription className="text-base">
                  {recipe.description}
                </DialogDescription>
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
