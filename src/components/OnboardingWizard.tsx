import { useState } from 'react';
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

interface OnboardingWizardProps {
  user: User;
  onComplete: () => void;
}

type FormData = {
  name: string;
  dietary_restrictions: string[];
  allergies: string[];
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
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'vegano', label: 'Vegano' },
  { id: 'celíaco', label: 'Celíaco (sin gluten)' },
  { id: 'sin_lactosa', label: 'Sin lactosa' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'sin_azúcar', label: 'Sin azúcar' },
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
  { id: 'asiática', label: 'Asiática' },
  { id: 'mediterránea', label: 'Mediterránea' },
  { id: 'argentina', label: 'Argentina' },
  { id: 'española', label: 'Española' },
  { id: 'india', label: 'India' },
  { id: 'japonesa', label: 'Japonesa' },
];

export function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const { createProfile, saving } = useProfile(user.id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      dietary_restrictions: [],
      allergies: [],
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

  const toggleArrayValue = (field: 'dietary_restrictions' | 'allergies' | 'cuisine_preferences', value: string) => {
    const currentValues = watch(field);
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setValue(field, newValues);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createProfile({
        user_id: user.id,
        ...data,
        onboarding_completed: true,
      });
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Step 1: Bienvenida + Nombre */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">¡Bienvenido a Chef AI!</h3>
                <p className="text-sm text-muted-foreground">
                  Vamos a configurar tu perfil para ofrecerte las mejores recomendaciones personalizadas.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">¿Cómo te llamas?</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Tu nombre"
                />
              </div>
            </div>
          )}

          {/* Step 2: Restricciones Dietéticas y Alergias */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">Restricciones Dietéticas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecciona las que apliquen (opcional):
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

          {/* Step 3: Objetivos Nutricionales */}
          {currentStep === 3 && (
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

          {/* Step 4: Información del Hogar */}
          {currentStep === 4 && (
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

          {/* Step 5: Preferencias de Cocina */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Preferencias de Cocina</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ¿Qué tipos de cocina te gustan? (selecciona varias):
                </p>
              </div>
              <div className="space-y-3">
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
