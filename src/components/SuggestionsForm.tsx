import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lightbulb } from 'lucide-react';

interface SuggestionFormData {
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'ui_ux' | 'other';
}

export function SuggestionsForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<'feature' | 'improvement' | 'ui_ux' | 'other'>('feature');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SuggestionFormData>({
    defaultValues: {
      title: '',
      description: '',
      category: 'feature',
    },
  });

  const onSubmit = async (data: SuggestionFormData) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Debes iniciar sesión para enviar una sugerencia');
        return;
      }

      const { error } = await supabase
        .from('suggestions')
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description,
          category: category,
          status: 'submitted',
          votes: 0,
        });

      if (error) {
        console.error('Error creating suggestion:', error);
        toast.error('Error al enviar la sugerencia. Intenta de nuevo.');
        return;
      }

      toast.success('¡Gracias por tu sugerencia! La revisaremos pronto.');
      reset();
      setCategory('feature');

      // Trigger refresh of suggestions list
      window.dispatchEvent(new CustomEvent('suggestion-created'));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al enviar la sugerencia');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Título <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Ej: Agregar modo oscuro a la aplicación"
          {...register('title', {
            required: 'El título es requerido',
            minLength: { value: 5, message: 'El título debe tener al menos 5 caracteres' },
          })}
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoría</Label>
        <Select value={category} onValueChange={(value) => setCategory(value as 'feature' | 'improvement' | 'ui_ux' | 'other')} disabled={isSubmitting}>
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="feature">Nueva funcionalidad</SelectItem>
            <SelectItem value="improvement">Mejora existente</SelectItem>
            <SelectItem value="ui_ux">Interfaz / Experiencia de usuario</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Descripción <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Describe tu sugerencia con el mayor detalle posible. ¿Qué problema resuelve? ¿Cómo mejoraría tu experiencia?"
          className="min-h-[120px]"
          {...register('description', {
            required: 'La descripción es requerida',
            minLength: { value: 20, message: 'La descripción debe tener al menos 20 caracteres' },
          })}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Lightbulb className="h-4 w-4" />
            Enviar sugerencia
          </>
        )}
      </Button>
    </form>
  );
}
