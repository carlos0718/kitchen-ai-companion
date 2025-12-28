import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';
import { toast } from 'sonner';

export function PaymentMethodCard() {
  const { openCustomerPortal, subscribed } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleManagePayment = async () => {
    setLoading(true);
    try {
      await openCustomerPortal();
    } catch (error) {
      toast.error('Error al abrir el portal', {
        description: 'No se pudo abrir el portal de gestión de pagos.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!subscribed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Método de Pago
          </CardTitle>
          <CardDescription>Gestiona tu método de pago</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No tienes un método de pago configurado</p>
            <p className="text-sm text-muted-foreground">
              Suscríbete a un plan para configurar tu método de pago
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Método de Pago
        </CardTitle>
        <CardDescription>Gestiona tu método de pago y facturación</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Método de pago configurado</p>
              <p className="text-sm text-muted-foreground">
                Gestionado a través de Stripe
              </p>
            </div>
          </div>
          <Badge variant="secondary">Activo</Badge>
        </div>

        <div className="space-y-2 p-4 bg-accent/10 rounded-lg">
          <div className="flex items-start gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Renovación automática</p>
              <p className="text-muted-foreground">
                Tu método de pago se carga automáticamente en cada período de facturación
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleManagePayment}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Abriendo portal...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              Actualizar método de pago
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Serás redirigido al portal seguro de Stripe para gestionar tu método de pago
        </p>
      </CardContent>
    </Card>
  );
}
