import { useMemo } from 'react';

export interface NutritionalGoals {
  dailyCalories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
}

export interface UserBiometrics {
  age?: number;
  gender?: string;
  height?: number; // cm
  weight?: number; // kg
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle';
}

export interface NutritionPercentages {
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
}

/**
 * Hook para calcular valores nutricionales personalizados
 * Usa la fórmula Mifflin-St Jeor para calcular BMR (Tasa Metabólica Basal)
 */
export function useNutritionCalculator(biometrics?: UserBiometrics) {
  const nutritionalGoals = useMemo<NutritionalGoals | null>(() => {
    if (!biometrics?.age || !biometrics?.gender || !biometrics?.height || !biometrics?.weight) {
      return null;
    }

    // Calcular BMR usando Mifflin-St Jeor
    const { age, gender, height, weight } = biometrics;
    let bmr: number;

    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else if (gender === 'female') {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    } else {
      // Para otros géneros, usar promedio
      bmr = 10 * weight + 6.25 * height - 5 * age - 78;
    }

    // Aplicar factor de actividad (TDEE = Total Daily Energy Expenditure)
    const activityMultipliers = {
      sedentary: 1.2,      // Poco o ningún ejercicio
      light: 1.375,        // Ejercicio ligero 1-3 días/semana
      moderate: 1.55,      // Ejercicio moderado 3-5 días/semana
      active: 1.725,       // Ejercicio fuerte 6-7 días/semana
      very_active: 1.9,    // Ejercicio muy fuerte, atleta
    };

    const activityLevel = biometrics.activityLevel || 'moderate';
    let tdee = bmr * activityMultipliers[activityLevel];

    // Ajustar según objetivo
    const goal = biometrics.goal || 'maintain';
    if (goal === 'lose_weight') {
      tdee = tdee * 0.85; // Déficit del 15%
    } else if (goal === 'gain_muscle') {
      tdee = tdee * 1.1; // Superávit del 10%
    }

    const dailyCalories = Math.round(tdee);

    // Calcular macronutrientes
    // Distribución estándar: 30% proteína, 40% carbos, 30% grasa
    let proteinPercent = 0.30;
    let carbsPercent = 0.40;
    let fatPercent = 0.30;

    // Ajustar distribución según objetivo
    if (goal === 'gain_muscle') {
      proteinPercent = 0.35; // Más proteína
      carbsPercent = 0.40;
      fatPercent = 0.25;
    } else if (goal === 'lose_weight') {
      proteinPercent = 0.35; // Más proteína para preservar músculo
      carbsPercent = 0.30;   // Menos carbos
      fatPercent = 0.35;     // Más grasa para saciedad
    }

    const protein = Math.round((dailyCalories * proteinPercent) / 4); // 4 kcal por gramo
    const carbs = Math.round((dailyCalories * carbsPercent) / 4);     // 4 kcal por gramo
    const fat = Math.round((dailyCalories * fatPercent) / 9);         // 9 kcal por gramo
    const fiber = Math.round(dailyCalories / 1000 * 14);              // 14g por 1000 kcal

    return {
      dailyCalories,
      protein,
      carbs,
      fat,
      fiber,
    };
  }, [biometrics]);

  /**
   * Calcula el porcentaje de cada macronutriente respecto a un total de calorías
   */
  const calculateMacroPercentages = (
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ): NutritionPercentages => {
    const proteinCals = protein * 4;
    const carbsCals = carbs * 4;
    const fatCals = fat * 9;
    const totalCals = proteinCals + carbsCals + fatCals;

    return {
      proteinPercent: Math.round((proteinCals / totalCals) * 100),
      carbsPercent: Math.round((carbsCals / totalCals) * 100),
      fatPercent: Math.round((fatCals / totalCals) * 100),
    };
  };

  /**
   * Calcula la cantidad de calorías de los macronutrientes
   */
  const calculateCaloriesFromMacros = (protein: number, carbs: number, fat: number): number => {
    return protein * 4 + carbs * 4 + fat * 9;
  };

  /**
   * Verifica si una comida se ajusta a los objetivos nutricionales (por comida)
   */
  const isMealWithinGoals = (
    mealNutrition: { calories: number; protein: number; carbs: number; fat: number },
    mealsPerDay: number = 3,
    tolerance: number = 0.15 // 15% de tolerancia
  ): boolean => {
    if (!nutritionalGoals) return true;

    const caloriesPerMeal = nutritionalGoals.dailyCalories / mealsPerDay;
    const proteinPerMeal = nutritionalGoals.protein / mealsPerDay;
    const carbsPerMeal = nutritionalGoals.carbs / mealsPerDay;
    const fatPerMeal = nutritionalGoals.fat / mealsPerDay;

    const withinRange = (value: number, target: number) => {
      const min = target * (1 - tolerance);
      const max = target * (1 + tolerance);
      return value >= min && value <= max;
    };

    return (
      withinRange(mealNutrition.calories, caloriesPerMeal) &&
      withinRange(mealNutrition.protein, proteinPerMeal) &&
      withinRange(mealNutrition.carbs, carbsPerMeal) &&
      withinRange(mealNutrition.fat, fatPerMeal)
    );
  };

  /**
   * Calcula el BMI a partir de altura y peso
   */
  const calculateBMI = (heightInCm: number, weightInKg: number): number => {
    const heightInMeters = heightInCm / 100;
    return Number((weightInKg / (heightInMeters * heightInMeters)).toFixed(1));
  };

  /**
   * Obtiene la categoría del BMI
   */
  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'Bajo peso';
    if (bmi < 25) return 'Peso normal';
    if (bmi < 30) return 'Sobrepeso';
    return 'Obesidad';
  };

  return {
    nutritionalGoals,
    calculateMacroPercentages,
    calculateCaloriesFromMacros,
    isMealWithinGoals,
    calculateBMI,
    getBMICategory,
  };
}
