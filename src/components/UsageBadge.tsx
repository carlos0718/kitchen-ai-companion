import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Zap, Crown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UsageBadgeProps {
  remaining: number;
  weeklyLimit: number;
  isPremium: boolean;
  onClick?: () => void;
}

export function UsageBadge({ remaining, weeklyLimit, isPremium, onClick }: UsageBadgeProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (isPremium) {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="focus:outline-none">
            <Badge
              variant="default"
              className="cursor-pointer flex items-center gap-1"
            >
              <Crown className="h-3 w-3" />
              <span className="hidden md:inline">Premium</span>
              <span className="md:hidden">Pro</span>
            </Badge>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="end">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">Plan Premium</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Tienes acceso ilimitado a todas las funciones de Chef AI, incluyendo el planificador de comidas y recetas premium.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setPopoverOpen(false);
                onClick?.();
              }}
            >
              Gestionar suscripción
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const isLow = remaining <= 3;
  const isEmpty = remaining === 0;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="focus:outline-none">
          <Badge
            variant={isEmpty ? 'destructive' : isLow ? 'secondary' : 'outline'}
            className="cursor-pointer flex items-center gap-1"
          >
            <Zap className="h-3 w-3" />
            <span>{remaining}/{weeklyLimit}</span>
            <span className="hidden md:inline">semanales</span>
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Consultas semanales</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Te quedan <strong>{remaining}</strong> de <strong>{weeklyLimit}</strong> consultas gratuitas esta semana.
            {isEmpty
              ? ' Has agotado tus consultas. ¡Actualiza a Premium para uso ilimitado!'
              : isLow
                ? ' Te quedan pocas consultas. Considera actualizar a Premium.'
                : ' Las consultas se reinician cada lunes.'}
          </p>
          <Button
            variant={isEmpty || isLow ? 'default' : 'outline'}
            size="sm"
            className="w-full"
            onClick={() => {
              setPopoverOpen(false);
              onClick?.();
            }}
          >
            {isEmpty || isLow ? 'Obtener Premium' : 'Ver planes'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
