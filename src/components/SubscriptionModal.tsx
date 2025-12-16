import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: 'free' | 'weekly' | 'monthly';
  onSubscribe: (plan: 'weekly' | 'monthly') => Promise<void>;
  onManage: () => Promise<void>;
}

const PLANS = [
  {
    id: 'free' as const,
    name: 'Gratis',
    price: '$0',
    period: '',
    features: ['10 consultas por día', 'Recetas básicas', 'Historial limitado'],
    icon: Sparkles,
  },
  {
    id: 'weekly' as const,
    name: 'Semanal',
    price: '$4.99',
    period: '/semana',
    features: ['Consultas ilimitadas', 'Recetas premium', 'Historial completo', 'Soporte prioritario'],
    icon: Crown,
    popular: true,
  },
  {
    id: 'monthly' as const,
    name: 'Mensual',
    price: '$14.99',
    period: '/mes',
    features: ['Consultas ilimitadas', 'Recetas premium', 'Historial completo', 'Soporte prioritario', 'Ahorra 25%'],
    icon: Crown,
  },
];

export function SubscriptionModal({ 
  open, 
  onOpenChange, 
  currentPlan, 
  onSubscribe,
  onManage,
}: SubscriptionModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (planId: 'weekly' | 'monthly') => {
    setLoading(planId);
    try {
      await onSubscribe(planId);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo procesar la suscripción',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    setLoading('manage');
    try {
      await onManage();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo abrir el portal de gestión',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Planes de Suscripción</DialogTitle>
          <DialogDescription>
            Elige el plan que mejor se adapte a tus necesidades culinarias
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3 mt-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            const isPaid = plan.id !== 'free';

            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${isCurrent ? 'bg-accent/50' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="secondary" className="absolute -top-2 right-2">
                    Tu plan
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {isCurrent && isPaid ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleManage}
                      disabled={loading === 'manage'}
                    >
                      {loading === 'manage' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Gestionar'
                      )}
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Plan actual
                    </Button>
                  ) : isPaid ? (
                    <Button 
                      className="w-full"
                      onClick={() => handleSubscribe(plan.id as 'weekly' | 'monthly')}
                      disabled={loading !== null}
                    >
                      {loading === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Suscribirse'
                      )}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
