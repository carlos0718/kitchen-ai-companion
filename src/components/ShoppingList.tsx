import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useShoppingList } from '@/hooks/useShoppingList';
import { ShoppingCart, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ShoppingListProps {
  mealPlanId?: string;
}

export function ShoppingList({ mealPlanId }: ShoppingListProps) {
  const { items, groupedItems, stats, loading, generateFromMealPlan, toggleItem, refreshList } =
    useShoppingList(mealPlanId);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Expandir todas las categorías por defecto si hay items
  if (items.length > 0 && expandedCategories.size === 0) {
    setExpandedCategories(new Set(Object.keys(groupedItems)));
  }

  const categoryOrder = [
    'Frutas y Verduras',
    'Carnes y Pescados',
    'Lácteos',
    'Huevos',
    'Granos y Cereales',
    'Legumbres',
    'Aceites y Salsas',
    'Condimentos y Especias',
    'Otros',
  ];

  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  if (!mealPlanId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Selecciona un plan de comidas para generar tu lista de compras</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Lista de Compras
              </CardTitle>
              {items.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {stats.checked} de {stats.total} items completados
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshList}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={generateFromMealPlan}
                disabled={loading}
                size="sm"
              >
                {items.length === 0 ? 'Generar Lista' : 'Regenerar'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {items.length > 0 && (
          <CardContent className="space-y-2">
            <Progress value={stats.progress} className="h-2" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{stats.progress}% completado</span>
              <span>{stats.unchecked} pendientes</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Lista de items por categoría */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <p className="mb-4">No hay items en tu lista de compras</p>
              <Button onClick={generateFromMealPlan} disabled={loading}>
                Generar Lista desde el Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedCategories.map((category) => {
            const categoryItems = groupedItems[category];
            const categoryChecked = categoryItems.filter((i) => i.checked).length;
            const isExpanded = expandedCategories.has(category);

            return (
              <Card key={category}>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{category}</CardTitle>
                      <Badge variant="secondary">
                        {categoryChecked}/{categoryItems.length}
                      </Badge>
                    </div>
                    {categoryChecked === categoryItems.length && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <div className="space-y-2">
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                            item.checked ? 'opacity-60' : ''
                          }`}
                        >
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => item.id && toggleItem(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span
                                className={`font-medium ${
                                  item.checked ? 'line-through text-gray-500' : ''
                                }`}
                              >
                                {item.name}
                              </span>
                              <span className="text-sm text-gray-600">
                                {item.amount} {item.unit}
                              </span>
                            </div>
                            {item.recipeNames && item.recipeNames.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Para: {item.recipeNames.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
