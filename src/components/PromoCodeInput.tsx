import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, CheckCircle2, X } from 'lucide-react';

export interface ValidatedPromo {
  code: string;
  type: 'free_trial' | 'discount_percent';
  value: number;
  applicable_plan: string | null;
}

interface PromoCodeInputProps {
  onValidated: (result: ValidatedPromo) => void;
  onCleared: () => void;
}

export function PromoCodeInput({ onValidated, onCleared }: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState<ValidatedPromo | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: code.trim() },
      });

      if (fnError) throw fnError;

      if (!data.valid) {
        setError(data.error ?? 'Código inválido');
        return;
      }

      const result: ValidatedPromo = {
        code: data.code,
        type: data.type,
        value: data.value,
        applicable_plan: data.applicable_plan,
      };
      setValidated(result);
      onValidated(result);
    } catch {
      setError('No se pudo verificar el código. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setError(null);
    setValidated(null);
    onCleared();
  };

  if (validated) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-700">
            {validated.type === 'free_trial'
              ? `¡${validated.value} días gratis de Premium!`
              : `${validated.value}% de descuento aplicado`}
          </p>
          <p className="text-xs text-green-600/80">Cupón <span className="font-mono font-bold">{validated.code}</span> validado</p>
        </div>
        <button type="button" onClick={handleClear} className="text-green-600 hover:text-green-800 transition-colors" aria-label="Quitar cupón">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ingresá tu código de cupón"
            className="pl-9 uppercase tracking-wider"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={loading || !code.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}
