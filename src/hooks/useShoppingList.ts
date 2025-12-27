import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShoppingListItem {
  id?: string;
  name: string;
  amount: number;
  unit: string;
  category: string;
  checked: boolean;
  recipeNames?: string[]; // Para rastrear de qué recetas viene
}

export interface GroupedShoppingList {
  [category: string]: ShoppingListItem[];
}

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
}

interface DbShoppingListItem {
  id: string;
  ingredient_name: string;
  amount: number;
  unit: string;
  category: string;
  is_checked: boolean;
}

interface DbMealPlanItem {
  recipe: {
    id: string;
    name: string;
    ingredients: unknown; // JSON from database
  } | null;
}

/**
 * Hook para gestionar listas de compras basadas en planes de comidas
 */
export function useShoppingList(mealPlanId?: string) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [shoppingListId, setShoppingListId] = useState<string | null>(null);
  const { toast } = useToast();

  // Categorizar ingredientes automáticamente
  const categorizeIngredient = (ingredientName: string): string => {
    const name = ingredientName.toLowerCase();

    // Frutas y Verduras
    if (
      /tomate|cebolla|ajo|zanahoria|papa|lechuga|espinaca|brócoli|coliflor|pimiento|pepino|calabaza|berenjena|aguacate|manzana|plátano|naranja|limón|fresa|uva|mango|piña|sandía|melón/.test(
        name
      )
    ) {
      return 'Frutas y Verduras';
    }

    // Carnes y Pescados
    if (
      /pollo|pavo|res|cerdo|cordero|pescado|salmón|atún|camarón|langostino|carne|pechuga|muslo/.test(
        name
      )
    ) {
      return 'Carnes y Pescados';
    }

    // Lácteos
    if (/leche|queso|yogur|mantequilla|crema|nata/.test(name)) {
      return 'Lácteos';
    }

    // Granos y Cereales
    if (
      /arroz|pasta|fideos|pan|harina|avena|quinoa|trigo|cereal|tortilla/.test(
        name
      )
    ) {
      return 'Granos y Cereales';
    }

    // Legumbres
    if (/frijol|lenteja|garbanzo|alubia|soya/.test(name)) {
      return 'Legumbres';
    }

    // Condimentos y Especias
    if (
      /sal|pimienta|orégano|comino|canela|pimentón|paprika|curry|jengibre|cúrcuma|perejil|cilantro|albahaca|tomillo|romero/.test(
        name
      )
    ) {
      return 'Condimentos y Especias';
    }

    // Aceites y Salsas
    if (
      /aceite|vinagre|salsa|mayonesa|mostaza|ketchup|soya|teriyaki/.test(name)
    ) {
      return 'Aceites y Salsas';
    }

    // Huevos
    if (/huevo/.test(name)) {
      return 'Huevos';
    }

    // Otros
    return 'Otros';
  };

  // Normalizar unidades similares
  const normalizeUnit = (unit: string): string => {
    const normalized = unit.toLowerCase().trim();
    const unitMap: { [key: string]: string } = {
      'gramo': 'g',
      'gramos': 'g',
      'kilogramo': 'kg',
      'kilogramos': 'kg',
      'litro': 'l',
      'litros': 'l',
      'mililitro': 'ml',
      'mililitros': 'ml',
      'cucharada': 'cdas',
      'cucharadas': 'cdas',
      'cucharadita': 'cdta',
      'cucharaditas': 'cdta',
      'taza': 'taza',
      'tazas': 'taza',
      'unidad': 'ud',
      'unidades': 'ud',
      'pieza': 'ud',
      'piezas': 'ud',
    };
    return unitMap[normalized] || normalized;
  };

  // Convertir unidades a una base común para sumar
  const convertToBaseUnit = (amount: number, unit: string): { amount: number; unit: string } => {
    const normalizedUnit = normalizeUnit(unit);

    // Convertir kg a g
    if (normalizedUnit === 'kg') {
      return { amount: amount * 1000, unit: 'g' };
    }

    // Convertir l a ml
    if (normalizedUnit === 'l') {
      return { amount: amount * 1000, unit: 'ml' };
    }

    return { amount, unit: normalizedUnit };
  };

  // Agregar ingredientes de múltiples recetas
  const aggregateIngredients = (recipes: Recipe[]): ShoppingListItem[] => {
    const ingredientMap = new Map<string, ShoppingListItem>();

    recipes.forEach((recipe) => {
      recipe.ingredients?.forEach((ingredient) => {
        const normalizedName = ingredient.name.toLowerCase().trim();
        const { amount, unit } = convertToBaseUnit(ingredient.amount, ingredient.unit);
        const key = `${normalizedName}-${unit}`;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.amount += amount;
          existing.recipeNames?.push(recipe.name);
        } else {
          ingredientMap.set(key, {
            name: ingredient.name,
            amount,
            unit,
            category: categorizeIngredient(ingredient.name),
            checked: false,
            recipeNames: [recipe.name],
          });
        }
      });
    });

    return Array.from(ingredientMap.values());
  };

  // Cargar lista de compras desde Supabase
  const loadShoppingList = async () => {
    if (!mealPlanId) return;

    setLoading(true);
    try {
      // Buscar si ya existe una lista para este plan
      const { data: existingList } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('meal_plan_id', mealPlanId)
        .maybeSingle();

      if (existingList) {
        setShoppingListId(existingList.id);

        // Cargar items de la lista
        const { data: listItems, error } = await supabase
          .from('shopping_list_items')
          .select('*')
          .eq('shopping_list_id', existingList.id)
          .order('category');

        if (error) throw error;

        // Mapear los campos de la base de datos al formato del componente
        const mappedItems = (listItems || []).map((item: DbShoppingListItem) => ({
          id: item.id,
          name: item.ingredient_name,
          amount: item.amount,
          unit: item.unit,
          category: item.category,
          checked: item.is_checked,
        }));

        setItems(mappedItems);
      }
    } catch (error) {
      console.error('Error loading shopping list:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la lista de compras',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generar lista de compras desde el plan de comidas
  const generateFromMealPlan = async () => {
    if (!mealPlanId) return;

    setLoading(true);
    try {
      // Obtener todas las recetas del plan
      const { data: mealPlanItems, error: mealPlanError } = await supabase
        .from('meal_plan_items')
        .select('recipe:recipes(*)')
        .eq('meal_plan_id', mealPlanId);

      if (mealPlanError) throw mealPlanError;

      const recipes: Recipe[] = mealPlanItems
        ?.map((item: DbMealPlanItem) => {
          if (!item.recipe) return null;
          return {
            id: item.recipe.id,
            name: item.recipe.name,
            ingredients: Array.isArray(item.recipe.ingredients)
              ? item.recipe.ingredients as Ingredient[]
              : [],
          };
        })
        .filter((recipe): recipe is Recipe => recipe !== null) || [];

      // Agregar ingredientes
      const aggregatedItems = aggregateIngredients(recipes);

      // Crear o actualizar lista en Supabase
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('No authenticated user');

      let listId = shoppingListId;

      if (!listId) {
        // Crear nueva lista
        const { data: newList, error: createError } = await supabase
          .from('shopping_lists')
          .insert({
            user_id: user.user.id,
            meal_plan_id: mealPlanId,
            name: `Lista - Plan ${new Date().toLocaleDateString()}`,
          })
          .select()
          .single();

        if (createError) throw createError;
        listId = newList.id;
        setShoppingListId(listId);
      }

      // Eliminar items anteriores
      await supabase
        .from('shopping_list_items')
        .delete()
        .eq('shopping_list_id', listId);

      // Insertar nuevos items
      const itemsToInsert = aggregatedItems.map((item) => ({
        shopping_list_id: listId,
        ingredient_name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        is_checked: false,
      }));

      const { data: insertedItems, error: insertError } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert)
        .select();

      if (insertError) throw insertError;

      // Mapear los campos de la base de datos al formato del componente
      const mappedInsertedItems = (insertedItems || []).map((item: DbShoppingListItem) => ({
        id: item.id,
        name: item.ingredient_name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        checked: item.is_checked,
      }));

      setItems(mappedInsertedItems);

      toast({
        title: 'Lista generada',
        description: `Se agregaron ${insertedItems?.length || 0} ingredientes`,
      });
    } catch (error) {
      console.error('Error generating shopping list:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar la lista de compras',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle estado de un item
  const toggleItem = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newChecked = !item.checked;

    // Actualizar localmente
    setItems(items.map((i) => (i.id === itemId ? { ...i, checked: newChecked } : i)));

    // Actualizar en Supabase
    try {
      await supabase
        .from('shopping_list_items')
        .update({ is_checked: newChecked })
        .eq('id', itemId);
    } catch (error) {
      console.error('Error updating item:', error);
      // Revertir cambio local
      setItems(items.map((i) => (i.id === itemId ? { ...i, checked: item.checked } : i)));
    }
  };

  // Agrupar items por categoría
  const groupedItems = useMemo<GroupedShoppingList>(() => {
    const grouped: GroupedShoppingList = {};
    items.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [items]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = items.length;
    const checked = items.filter((i) => i.checked).length;
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { total, checked, unchecked: total - checked, progress };
  }, [items]);

  // Cargar lista al montar
  useEffect(() => {
    loadShoppingList();
  }, [mealPlanId]);

  return {
    items,
    groupedItems,
    stats,
    loading,
    generateFromMealPlan,
    toggleItem,
    refreshList: loadShoppingList,
  };
}
