import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { User as UserIcon, Loader2 } from 'lucide-react';

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

export function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    dietary_restrictions: [] as string[],
    allergies: [] as string[],
    cuisine_preferences: [] as string[],
    daily_calorie_goal: null as number | null,
    protein_goal: null as number | null,
    carbs_goal: null as number | null,
    fat_goal: null as number | null,
    household_size: 1,
    cooking_skill_level: 'intermedio',
    max_prep_time: 60,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const { profile, loading, saving, updateProfile } = useProfile(user?.id);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        dietary_restrictions: profile.dietary_restrictions || [],
        allergies: profile.allergies || [],
        cuisine_preferences: profile.cuisine_preferences || [],
        daily_calorie_goal: profile.daily_calorie_goal,
        protein_goal: profile.protein_goal,
        carbs_goal: profile.carbs_goal,
        fat_goal: profile.fat_goal,
        household_size: profile.household_size,
        cooking_skill_level: profile.cooking_skill_level,
        max_prep_time: profile.max_prep_time,
      });
    }
  }, [profile]);

  const toggleArrayValue = (field: 'dietary_restrictions' | 'allergies' | 'cuisine_preferences', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSave = async () => {
    await updateProfile(formData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold">Mi Perfil</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Perfil</TabsTrigger>
            <TabsTrigger value="diet">Dieta</TabsTrigger>
            <TabsTrigger value="nutrition">Objetivos</TabsTrigger>
            <TabsTrigger value="preferences">Preferencias</TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Actualiza tu información básica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">
                    El email no se puede cambiar desde aquí
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diet Tab */}
          <TabsContent value="diet">
            <Card>
              <CardHeader>
                <CardTitle>Restricciones Dietéticas y Alergias</CardTitle>
                <CardDescription>Gestiona tus preferencias alimentarias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Restricciones Dietéticas</h3>
                  <div className="space-y-3">
                    {DIETARY_RESTRICTIONS.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`diet-${item.id}`}
                          checked={formData.dietary_restrictions.includes(item.id)}
                          onCheckedChange={() => toggleArrayValue('dietary_restrictions', item.id)}
                        />
                        <Label htmlFor={`diet-${item.id}`} className="font-normal cursor-pointer">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Alergias Alimentarias</h3>
                  <div className="space-y-3">
                    {COMMON_ALLERGIES.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`allergy-${item.id}`}
                          checked={formData.allergies.includes(item.id)}
                          onCheckedChange={() => toggleArrayValue('allergies', item.id)}
                        />
                        <Label htmlFor={`allergy-${item.id}`} className="font-normal cursor-pointer">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Preferencias de Cocina</h3>
                  <div className="space-y-3">
                    {CUISINE_TYPES.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cuisine-${item.id}`}
                          checked={formData.cuisine_preferences.includes(item.id)}
                          onCheckedChange={() => toggleArrayValue('cuisine_preferences', item.id)}
                        />
                        <Label htmlFor={`cuisine-${item.id}`} className="font-normal cursor-pointer">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nutrition Goals Tab */}
          <TabsContent value="nutrition">
            <Card>
              <CardHeader>
                <CardTitle>Objetivos Nutricionales</CardTitle>
                <CardDescription>Configura tus metas diarias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="daily_calorie_goal">Calorías diarias objetivo</Label>
                  <Input
                    id="daily_calorie_goal"
                    type="number"
                    value={formData.daily_calorie_goal || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        daily_calorie_goal: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Ej: 2000"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="protein_goal">Proteínas (g)</Label>
                    <Input
                      id="protein_goal"
                      type="number"
                      value={formData.protein_goal || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          protein_goal: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="Ej: 150"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carbs_goal">Carbohidratos (g)</Label>
                    <Input
                      id="carbs_goal"
                      type="number"
                      value={formData.carbs_goal || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          carbs_goal: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="Ej: 200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fat_goal">Grasas (g)</Label>
                    <Input
                      id="fat_goal"
                      type="number"
                      value={formData.fat_goal || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fat_goal: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="Ej: 60"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferencias de Cocina</CardTitle>
                <CardDescription>Personaliza tu experiencia culinaria</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="household_size">¿Para cuántas personas cocinas?</Label>
                  <Input
                    id="household_size"
                    type="number"
                    value={formData.household_size}
                    onChange={(e) =>
                      setFormData({ ...formData, household_size: parseInt(e.target.value) || 1 })
                    }
                    min="1"
                    max="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cooking_skill_level">Nivel de cocina</Label>
                  <Select
                    value={formData.cooking_skill_level}
                    onValueChange={(value) => setFormData({ ...formData, cooking_skill_level: value })}
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
                    value={formData.max_prep_time}
                    onChange={(e) =>
                      setFormData({ ...formData, max_prep_time: parseInt(e.target.value) || 60 })
                    }
                    min="15"
                    max="180"
                    step="15"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
