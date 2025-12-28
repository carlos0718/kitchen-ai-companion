import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';

interface SupportFormData {
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export function SupportForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SupportFormData>({
    defaultValues: {
      subject: '',
      description: '',
      priority: 'medium',
    },
  });

  const onSubmit = async (data: SupportFormData) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Debes iniciar sesión para enviar una consulta');
        return;
      }

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: data.subject,
          description: data.description,
          priority: priority,
          status: 'open',
        });

      if (error) {
        console.error('Error creating support ticket:', error);
        toast.error('Error al enviar la consulta. Intenta de nuevo.');
        return;
      }

      toast.success('Consulta enviada exitosamente. Te responderemos pronto.');
      reset();
      setPriority('medium');

      // Trigger refresh of support tickets list
      window.dispatchEvent(new CustomEvent('support-ticket-created'));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al enviar la consulta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">
          Asunto <span className="text-destructive">*</span>
        </Label>
        <Input
          id="subject"
          placeholder="Ej: No puedo generar plan de comidas"
          {...register('subject', {
            required: 'El asunto es requerido',
            minLength: { value: 5, message: 'El asunto debe tener al menos 5 caracteres' },
          })}
          disabled={isSubmitting}
        />
        {errors.subject && (
          <p className="text-sm text-destructive">{errors.subject.message}</p>
        )}
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Prioridad</Label>
        <Select value={priority} onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high')} disabled={isSubmitting}>
          <SelectTrigger id="priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Baja</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
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
          placeholder="Describe tu problema o consulta con el mayor detalle posible..."
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
            <Send className="h-4 w-4" />
            Enviar consulta
          </>
        )}
      </Button>
    </form>
  );
}
