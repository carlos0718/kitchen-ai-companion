import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubscription } from '@/hooks/useSubscription';

const PLAN_PRICES: Record<string, number> = {
  weekly: 4.99,
  monthly: 14.99,
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

export function NextBillingCard() {
  const { subscribed, plan, currentPeriodEnd, cancelAtPeriodEnd, isPastDue, isCanceling } = useSubscription();

  if (!subscribed || plan === 'free') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próxima Facturación
          </CardTitle>
          <CardDescription>Detalles de tu próximo cobro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No tienes facturación programada</p>
            <p className="text-sm text-muted-foreground">
              Suscríbete a un plan para ver tu próxima facturación
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextBillingDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const daysRemaining = nextBillingDate
    ? Math.ceil((nextBillingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const amount = PLAN_PRICES[plan] || 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Próxima Facturación
        </CardTitle>
        <CardDescription>Detalles de tu próximo cobro</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alerts for special states */}
        {isPastDue && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tu último pago falló. Por favor actualiza tu método de pago para evitar la suspensión del servicio.
            </AlertDescription>
          </Alert>
        )}

        {isCanceling && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tu suscripción se cancelará al final del período actual. No se realizarán más cobros.
            </AlertDescription>
          </Alert>
        )}

        {/* Billing Info */}
        {!isCanceling && (
          <>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto a cobrar</p>
                  <p className="text-2xl font-bold">{formatAmount(amount)}</p>
                </div>
              </div>
              <Badge className="bg-primary">
                {PLAN_LABELS[plan] || plan}
              </Badge>
            </div>

            {nextBillingDate && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de renovación</p>
                      <p className="font-semibold">{formatDate(nextBillingDate)}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}
                  </Badge>
                </div>

                <div className="flex items-start gap-2 p-3 bg-accent/5 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Renovación automática</p>
                    <p className="text-muted-foreground">
                      Tu suscripción se renovará automáticamente el {formatDate(nextBillingDate)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {isCanceling && nextBillingDate && (
          <div className="p-4 bg-accent/10 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Acceso hasta</p>
                <p className="font-semibold">{formatDate(nextBillingDate)}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Puedes seguir usando las funcionalidades premium hasta esta fecha
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            {plan === 'weekly' ? 'Cobro semanal' : 'Cobro mensual'}. Puedes cancelar en cualquier momento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
