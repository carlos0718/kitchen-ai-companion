import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChefHat, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  user: User;
  onComplete: () => void;
}

type FormData = {
  name: string;
  last_name: string;
  country: string;
  birth_year: number | null;
  height: number | null;
  weight: number | null;
  gender: string;
  bmi: number | null;
  dietary_restrictions: string[];
  allergies: string[];
  diet_type: string;
  snack_preference: string;
  flexible_mode: boolean;
  daily_calorie_goal: number | null;
  protein_goal: number | null;
  carbs_goal: number | null;
  fat_goal: number | null;
  household_size: number;
  cooking_skill_level: string;
  max_prep_time: number;
  cuisine_preferences: string[];
};

const DIETARY_RESTRICTIONS = [
  { id: 'celíaco', label: 'Celíaco (sin gluten)' },
  { id: 'sin_lactosa', label: 'Sin lactosa' },
  { id: 'sin_azúcar', label: 'Sin azúcar' },
  { id: 'bajo_en_sodio', label: 'Bajo en sodio (hipertensión)' },
  { id: 'diabético', label: 'Diabético / Bajo índice glucémico' },
  { id: 'sin_cerdo', label: 'Sin cerdo (Halal/Kosher)' },
  { id: 'bajo_colesterol', label: 'Bajo en colesterol' },
];

const DIET_TYPES = [
  {
    id: 'casera_normal',
    label: 'Comida Casera Normal',
    description: 'Comida familiar equilibrada sin restricciones especiales'
  },
  {
    id: 'keto',
    label: 'Dieta Keto',
    description: 'Baja en carbohidratos, alta en grasas saludables (70% grasa, 20% proteína, 10% carbos)'
  },
  {
    id: 'paleo',
    label: 'Dieta Paleo',
    description: 'Basada en alimentos no procesados (30% proteína, 35% carbos, 35% grasa)'
  },
  {
    id: 'vegetariano',
    label: 'Vegetariana',
    description: 'Sin carne ni pescado, incluye lácteos y huevos'
  },
  {
    id: 'vegano',
    label: 'Vegana',
    description: 'Basada en plantas, sin productos de origen animal'
  },
  {
    id: 'deportista',
    label: 'Deportista/Alta Proteína',
    description: 'Optimizada para rendimiento físico (30% proteína, 45% carbos, 25% grasa)'
  },
  {
    id: 'ayuno_intermitente',
    label: 'Ayuno Intermitente',
    description: 'Alterna períodos de ayuno con ventanas de alimentación (16:8, 14:10, etc.)'
  },
];

const SNACK_PREFERENCES = [
  { id: '3meals', label: '3 comidas (Desayuno, Almuerzo, Cena)' },
  { id: '4meals', label: '4 comidas (+ Snack matutino)' },
  { id: '5meals', label: '5 comidas (+ 2 Snacks)' },
];

const COMMON_ALLERGIES = [
  { id: 'nueces', label: 'Nueces' },
  { id: 'maní', label: 'Maní' },
  { id: 'mariscos', label: 'Mariscos' },
  { id: 'huevo', label: 'Huevo' },
  { id: 'soja', label: 'Soja' },
  { id: 'pescado', label: 'Pescado' },
];

const CUISINE_TYPES = [
  { id: 'mexicana', label: 'Mexicana' },
  { id: 'italiana', label: 'Italiana' },
  { id: 'peruana', label: 'Peruana' },
  { id: 'nikkei', label: 'Nikkei (Fusión Peruano-Japonesa)' },
  { id: 'japonesa', label: 'Japonesa' },
  { id: 'china', label: 'China' },
  { id: 'tailandesa', label: 'Tailandesa' },
  { id: 'vietnamita', label: 'Vietnamita' },
  { id: 'coreana', label: 'Coreana' },
  { id: 'india', label: 'India' },
  { id: 'mediterránea', label: 'Mediterránea' },
  { id: 'española', label: 'Española' },
  { id: 'francesa', label: 'Francesa' },
  { id: 'argentina', label: 'Argentina' },
  { id: 'brasileña', label: 'Brasileña' },
  { id: 'colombiana', label: 'Colombiana' },
  { id: 'venezolana', label: 'Venezolana' },
  { id: 'árabe', label: 'Árabe' },
  { id: 'fusión', label: 'Fusión / Moderna' },
];

export function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;
  const { createProfile, saving } = useProfile(user.id);
  const [customCuisine, setCustomCuisine] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      last_name: '',
      country: '',
      birth_year: null,
      height: null,
      weight: null,
      gender: '',
      bmi: null,
      dietary_restrictions: [],
      allergies: [],
      diet_type: 'casera_normal',
      snack_preference: '3meals',
      flexible_mode: true,
      daily_calorie_goal: null,
      protein_goal: null,
      carbs_goal: null,
      fat_goal: null,
      household_size: 1,
      cooking_skill_level: 'intermedio',
      max_prep_time: 60,
      cuisine_preferences: [],
    },
  });

  const dietaryRestrictions = watch('dietary_restrictions');
  const allergies = watch('allergies');
  const cuisinePreferences = watch('cuisine_preferences');
  const height = watch('height');
  const weight = watch('weight');
  const bmi = watch('bmi');

  // Función para calcular el IMC
  const calculateBMI = (heightInCm: number | null, weightInKg: number | null): number | null => {
    if (!heightInCm || !weightInKg || heightInCm <= 0 || weightInKg <= 0) return null;
    const heightInMeters = heightInCm / 100;
    return Number((weightInKg / (heightInMeters * heightInMeters)).toFixed(1));
  };

  // Función para obtener categoría del IMC
  const getBMICategory = (bmi: number | null): { category: string; color: string } => {
    if (!bmi) return { category: '', color: '' };
    if (bmi < 18.5) return { category: 'Bajo peso', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Peso normal', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Sobrepeso', color: 'text-yellow-600' };
    return { category: 'Obesidad', color: 'text-red-600' };
  };

  // Efecto para calcular IMC automáticamente
  useEffect(() => {
    const calculatedBMI = calculateBMI(height, weight);
    if (calculatedBMI !== null && calculatedBMI !== bmi) {
      setValue('bmi', calculatedBMI);
    }
  }, [height, weight, bmi, setValue]);

  const toggleArrayValue = (field: 'dietary_restrictions' | 'allergies' | 'cuisine_preferences', value: string) => {
    const currentValues = watch(field);
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setValue(field, newValues);
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Calculate age from birth year
      const currentYear = new Date().getFullYear();
      const age = data.birth_year ? currentYear - data.birth_year : null;

      // Remove birth_year and add calculated age
      const { birth_year, ...restData } = data;

      await createProfile({
        user_id: user.id,
        ...restData,
        age,
        onboarding_completed: true,
      });
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const nextStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        hideOverlay={true}
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <ChefHat className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl">Configuración de Perfil</DialogTitle>
          <DialogDescription className="text-center">
            Paso {currentStep} de {totalSteps}
          </DialogDescription>
          <Progress value={(currentStep / totalSteps) * 100} className="mt-4" />
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            // Prevenir submit con Enter si no estamos en el último paso
            if (e.key === 'Enter' && currentStep < totalSteps) {
              e.preventDefault();
              nextStep();
            }
          }}
          className="space-y-6 mt-6"
        >
          {/* Step 1: Bienvenida + Datos Básicos */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">¡Bienvenido a Chef AI!</h3>
                <p className="text-sm text-muted-foreground">
                  Vamos a configurar tu perfil para ofrecerte las mejores recomendaciones personalizadas.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Select
                    value={watch('country') || ''}
                    onValueChange={(value) => setValue('country', value)}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Selecciona tu país" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AR">Argentina</SelectItem>
                      <SelectItem value="BO">Bolivia</SelectItem>
                      <SelectItem value="CL">Chile</SelectItem>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="CR">Costa Rica</SelectItem>
                      <SelectItem value="CU">Cuba</SelectItem>
                      <SelectItem value="EC">Ecuador</SelectItem>
                      <SelectItem value="SV">El Salvador</SelectItem>
                      <SelectItem value="ES">España</SelectItem>
                      <SelectItem value="GT">Guatemala</SelectItem>
                      <SelectItem value="HN">Honduras</SelectItem>
                      <SelectItem value="MX">México</SelectItem>
                      <SelectItem value="NI">Nicaragua</SelectItem>
                      <SelectItem value="PA">Panamá</SelectItem>
                      <SelectItem value="PY">Paraguay</SelectItem>
                      <SelectItem value="PE">Perú</SelectItem>
                      <SelectItem value="PR">Puerto Rico</SelectItem>
                      <SelectItem value="DO">República Dominicana</SelectItem>
                      <SelectItem value="UY">Uruguay</SelectItem>
                      <SelectItem value="VE">Venezuela</SelectItem>
                      <SelectItem value="US">Estados Unidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_year">Año de nacimiento</Label>
                  <Input
                    id="birth_year"
                    type="number"
                    {...register('birth_year', { valueAsNumber: true })}
                    placeholder="1990"
                    min="1920"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Datos Biométricos */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Datos Personales</h3>
                <p className="text-sm text-muted-foreground">
                  Esto nos ayuda a calcular tus necesidades nutricionales
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <Select
                  value={watch('gender') || ''}
                  onValueChange={(value) => setValue('gender', value)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefiero no decir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    {...register('height', { valueAsNumber: true })}
                    placeholder="170"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    {...register('weight', { valueAsNumber: true })}
                    placeholder="70"
                  />
                </div>
              </div>

              {bmi && (
                <div className="mt-4 p-4 bg-accent rounded-lg text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Tu IMC (Índice de Masa Corporal)</div>
                  <div className="text-3xl font-bold">{bmi}</div>
                  <div className={`text-sm font-medium ${getBMICategory(bmi).color}`}>
                    {getBMICategory(bmi).category}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Esto nos ayuda a personalizar tus recomendaciones nutricionales
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Restricciones Médicas y Alergias */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">Restricciones Médicas / Intolerancias</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ¿Tienes alguna condición médica o intolerancia alimentaria? (opcional):
                </p>
                <div className="space-y-3">
                  {DIETARY_RESTRICTIONS.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`diet-${item.id}`}
                        checked={dietaryRestrictions.includes(item.id)}
                        onCheckedChange={() => toggleArrayValue('dietary_restrictions', item.id)}
                      />
                      <Label htmlFor={`diet-${item.id}`} className="font-normal cursor-pointer">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4">Alergias Alimentarias</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecciona las que tengas (opcional):
                </p>
                <div className="space-y-3">
                  {COMMON_ALLERGIES.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`allergy-${item.id}`}
                        checked={allergies.includes(item.id)}
                        onCheckedChange={() => toggleArrayValue('allergies', item.id)}
                      />
                      <Label htmlFor={`allergy-${item.id}`} className="font-normal cursor-pointer">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Tipo de Dieta */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">¿Qué tipo de plan alimenticio prefieres?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecciona el enfoque que mejor se adapte a tus necesidades.{' '}
                  <a href="/diet-guide" target="_blank" className="text-primary hover:underline">
                    Ver guía de dietas
                  </a>
                </p>
                <div className="grid gap-3">
                  {DIET_TYPES.map((diet) => (
                    <label
                      key={diet.id}
                      className={cn(
                        'flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all',
                        watch('diet_type') === diet.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <input
                        type="radio"
                        value={diet.id}
                        {...register('diet_type')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{diet.label}</div>
                        <div className="text-sm text-muted-foreground">{diet.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">¿Cuántas comidas al día prefieres?</h3>
                <div className="grid gap-3">
                  {SNACK_PREFERENCES.map((pref) => (
                    <label
                      key={pref.id}
                      className={cn(
                        'flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all',
                        watch('snack_preference') === pref.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <input
                        type="radio"
                        value={pref.id}
                        {...register('snack_preference')}
                      />
                      <span>{pref.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-accent rounded-lg">
                <input
                  type="checkbox"
                  id="flexible_mode"
                  {...register('flexible_mode')}
                  className="mt-1"
                />
                <label htmlFor="flexible_mode" className="text-sm">
                  <span className="font-medium">Modo flexible</span>
                  <p className="text-muted-foreground mt-1">
                    Permite ingredientes similares si los exactos no están disponibles.
                    Desactiva esta opción si necesitas seguir las restricciones de manera estricta.
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Step 5: Objetivos Nutricionales */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Objetivos Nutricionales</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ingresa tus metas diarias (opcional, puedes dejarlo en blanco):
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_calorie_goal">Calorías diarias objetivo</Label>
                <Input
                  id="daily_calorie_goal"
                  type="number"
                  {...register('daily_calorie_goal', { valueAsNumber: true })}
                  placeholder="Ej: 2000"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="protein_goal">Proteínas (g)</Label>
                  <Input
                    id="protein_goal"
                    type="number"
                    {...register('protein_goal', { valueAsNumber: true })}
                    placeholder="Ej: 150"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs_goal">Carbohidratos (g)</Label>
                  <Input
                    id="carbs_goal"
                    type="number"
                    {...register('carbs_goal', { valueAsNumber: true })}
                    placeholder="Ej: 200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat_goal">Grasas (g)</Label>
                  <Input
                    id="fat_goal"
                    type="number"
                    {...register('fat_goal', { valueAsNumber: true })}
                    placeholder="Ej: 60"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Información del Hogar */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Información del Hogar</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ayúdanos a personalizar las porciones y recetas:
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="household_size">¿Para cuántas personas cocinas?</Label>
                <Input
                  id="household_size"
                  type="number"
                  {...register('household_size', { valueAsNumber: true })}
                  min="1"
                  max="10"
                  defaultValue={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cooking_skill_level">Nivel de cocina</Label>
                <Select
                  value={watch('cooking_skill_level')}
                  onValueChange={(value) => setValue('cooking_skill_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principiante">Principiante</SelectItem>
                    <SelectItem value="intermedio">Intermedio</SelectItem>
                    <SelectItem value="avanzado">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_prep_time">Tiempo máximo de preparación (minutos)</Label>
                <Input
                  id="max_prep_time"
                  type="number"
                  {...register('max_prep_time', { valueAsNumber: true })}
                  min="15"
                  max="180"
                  step="15"
                  defaultValue={60}
                />
              </div>
            </div>
          )}

          {/* Step 7: Preferencias de Cocina */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Preferencias de Cocina</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ¿Qué tipos de cocina te gustan? (selecciona varias):
                </p>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {CUISINE_TYPES.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cuisine-${item.id}`}
                      checked={cuisinePreferences.includes(item.id)}
                      onCheckedChange={() => toggleArrayValue('cuisine_preferences', item.id)}
                    />
                    <Label htmlFor={`cuisine-${item.id}`} className="font-normal cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t space-y-2">
                <Label htmlFor="custom_cuisine">¿Otro tipo de cocina?</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom_cuisine"
                    value={customCuisine}
                    onChange={(e) => setCustomCuisine(e.target.value)}
                    placeholder="Ej: Turca, Griega, Marroquí..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      if (customCuisine.trim()) {
                        const cuisineId = customCuisine.toLowerCase().trim();
                        if (!cuisinePreferences.includes(cuisineId)) {
                          setValue('cuisine_preferences', [...cuisinePreferences, cuisineId]);
                          setCustomCuisine('');
                        }
                      }
                    }}
                    disabled={!customCuisine.trim()}
                  >
                    Agregar
                  </Button>
                </div>
                {cuisinePreferences.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {cuisinePreferences
                      .filter((pref) => !CUISINE_TYPES.find((t) => t.id === pref))
                      .map((custom) => (
                        <div
                          key={custom}
                          className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          <span className="capitalize">{custom}</span>
                          <button
                            type="button"
                            onClick={() => toggleArrayValue('cuisine_preferences', custom)}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || saving}
            >
              Anterior
            </Button>
            {currentStep < totalSteps ? (
              <Button type="button" onClick={nextStep}>
                Siguiente
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Completar'
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
