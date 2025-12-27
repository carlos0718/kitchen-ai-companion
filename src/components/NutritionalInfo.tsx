import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NutritionalGoals } from "@/hooks/useNutritionCalculator";

interface NutritionalInfoProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  goals?: NutritionalGoals | null;
  showPercentages?: boolean;
  compact?: boolean;
  mealsPerDay?: number; // Para calcular porción del objetivo diario
}

export function NutritionalInfo({
  calories,
  protein,
  carbs,
  fat,
  fiber,
  goals,
  showPercentages = true,
  compact = false,
  mealsPerDay = 3,
}: NutritionalInfoProps) {
  // Calcular porcentajes respecto a objetivos diarios (por comida)
  const getPercentage = (value: number, goalValue: number) => {
    if (!goals || !goalValue) return null;
    const mealGoal = goalValue / mealsPerDay;
    return Math.min(Math.round((value / mealGoal) * 100), 100);
  };

  const caloriesPercent = goals ? getPercentage(calories, goals.dailyCalories) : null;
  const proteinPercent = goals ? getPercentage(protein, goals.protein) : null;
  const carbsPercent = goals ? getPercentage(carbs, goals.carbs) : null;
  const fatPercent = goals ? getPercentage(fat, goals.fat) : null;
  const fiberPercent = goals && fiber ? getPercentage(fiber, goals.fiber) : null;

  // Calcular calorías de cada macro
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalMacroCals = proteinCals + carbsCals + fatCals;

  // Calcular distribución porcentual de macros
  const macroDistribution = {
    protein: Math.round((proteinCals / totalMacroCals) * 100),
    carbs: Math.round((carbsCals / totalMacroCals) * 100),
    fat: Math.round((fatCals / totalMacroCals) * 100),
  };

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-orange-600">{calories}</div>
          <div className="text-xs text-gray-600">kcal</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600">{protein}g</div>
          <div className="text-xs text-gray-600">Proteína</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{carbs}g</div>
          <div className="text-xs text-gray-600">Carbos</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-600">{fat}g</div>
          <div className="text-xs text-gray-600">Grasa</div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Información Nutricional</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calorías */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-orange-600">Calorías</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-orange-600">{calories}</span>
              <span className="text-sm text-gray-500 ml-1">kcal</span>
              {goals && caloriesPercent !== null && (
                <div className="text-xs text-gray-500">
                  {caloriesPercent}% de tu objetivo por comida
                </div>
              )}
            </div>
          </div>
          {caloriesPercent !== null && (
            <Progress value={caloriesPercent} className="h-2" />
          )}
        </div>

        {/* Macronutrientes */}
        <div className="space-y-3">
          {/* Proteína */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-red-600">Proteína</span>
              <div className="text-right">
                <span className="font-semibold">{protein}g</span>
                {showPercentages && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({macroDistribution.protein}%)
                  </span>
                )}
              </div>
            </div>
            {proteinPercent !== null && (
              <Progress value={proteinPercent} className="h-1.5 bg-red-100" />
            )}
          </div>

          {/* Carbohidratos */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-600">Carbohidratos</span>
              <div className="text-right">
                <span className="font-semibold">{carbs}g</span>
                {showPercentages && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({macroDistribution.carbs}%)
                  </span>
                )}
              </div>
            </div>
            {carbsPercent !== null && (
              <Progress value={carbsPercent} className="h-1.5 bg-blue-100" />
            )}
          </div>

          {/* Grasa */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-yellow-600">Grasa</span>
              <div className="text-right">
                <span className="font-semibold">{fat}g</span>
                {showPercentages && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({macroDistribution.fat}%)
                  </span>
                )}
              </div>
            </div>
            {fatPercent !== null && (
              <Progress value={fatPercent} className="h-1.5 bg-yellow-100" />
            )}
          </div>

          {/* Fibra (opcional) */}
          {fiber !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-600">Fibra</span>
                <div className="text-right">
                  <span className="font-semibold">{fiber}g</span>
                </div>
              </div>
              {fiberPercent !== null && (
                <Progress value={fiberPercent} className="h-1.5 bg-green-100" />
              )}
            </div>
          )}
        </div>

        {/* Distribución visual de macros */}
        {showPercentages && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Distribución de macronutrientes</div>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div
                className="bg-red-500"
                style={{ width: `${macroDistribution.protein}%` }}
                title={`Proteína: ${macroDistribution.protein}%`}
              />
              <div
                className="bg-blue-500"
                style={{ width: `${macroDistribution.carbs}%` }}
                title={`Carbohidratos: ${macroDistribution.carbs}%`}
              />
              <div
                className="bg-yellow-500"
                style={{ width: `${macroDistribution.fat}%` }}
                title={`Grasa: ${macroDistribution.fat}%`}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>P: {macroDistribution.protein}%</span>
              <span>C: {macroDistribution.carbs}%</span>
              <span>G: {macroDistribution.fat}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
