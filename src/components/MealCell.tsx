import { Button } from '@/components/ui/button';
import { Eye, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Recipe {
  id: string;
  name: string;
  calories: number | null;
  prep_time: number | null;
}

interface MealCellProps {
  recipe: Recipe | null;
  mealType: string;
  isCompleted?: boolean;
  onRemove?: () => void;
  onViewDetails?: () => void;
  onToggleCompleted?: (completed: boolean) => void;
  onReplace?: () => void;
}

export function MealCell({
  recipe,
  isCompleted = false,
  onRemove,
  onViewDetails,
  onToggleCompleted,
  onReplace,
}: MealCellProps) {
  if (!recipe) {
    return (
      <div className="h-full min-h-[78px] flex items-center justify-center rounded-lg border border-dashed border-border/50 text-muted-foreground/40 text-[11px] select-none">
        —
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-1 rounded-lg border bg-background p-2 h-full min-h-[78px] transition-shadow hover:shadow-sm',
        isCompleted && 'opacity-55'
      )}
    >
      {/* Name */}
      <p className="text-[11px] font-medium leading-tight line-clamp-3 pr-4 flex-1">
        {recipe.name}
      </p>

      {/* Meta */}
      {(recipe.calories || recipe.prep_time) && (
        <p className="text-[10px] text-muted-foreground/70">
          {recipe.calories ? `${recipe.calories} kcal` : ''}
          {recipe.calories && recipe.prep_time ? ' · ' : ''}
          {recipe.prep_time ? `${recipe.prep_time} min` : ''}
        </p>
      )}

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onViewDetails && (
          <Button
            variant="ghost" size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            title="Ver receta"
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
        {onToggleCompleted && (
          <Button
            variant="ghost" size="icon"
            className={cn('h-5 w-5', isCompleted && 'text-primary')}
            onClick={(e) => { e.stopPropagation(); onToggleCompleted(!isCompleted); }}
            title={isCompleted ? 'Marcar pendiente' : 'Marcar completado'}
          >
            <CheckCircle2 className="h-3 w-3" />
          </Button>
        )}
        {onReplace && (
          <Button
            variant="ghost" size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); onReplace(); }}
            title="Reemplazar"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Eliminar"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
