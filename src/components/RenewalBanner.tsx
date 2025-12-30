import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, ExternalLink } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function RenewalBanner() {
  const navigate = useNavigate();
  const {
    subscribed,
    paymentGateway,
    isRecurring,
    daysUntilExpiration,
    status,
  } = useSubscription();

  // Only show for non-recurring subscriptions (Mercado Pago)
  // that are active and expiring soon
  const shouldShow =
    subscribed &&
    paymentGateway === 'mercadopago' &&
    !isRecurring &&
    status === 'active' &&
    daysUntilExpiration !== null &&
    daysUntilExpiration <= 3;

  if (!shouldShow) return null;

  const isUrgent = daysUntilExpiration! <= 1;

  const handleRenew = () => {
    navigate('/pricing');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Alert
          variant={isUrgent ? 'destructive' : 'default'}
          className={
            isUrgent
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-amber-500/50 bg-amber-500/10'
          }
        >
          <AlertTriangle
            className={`h-5 w-5 ${
              isUrgent ? 'text-red-600' : 'text-amber-600'
            }`}
          />
          <AlertTitle className="text-lg font-semibold flex items-center gap-2">
            {isUrgent ? (
              <>¡Tu suscripción expira pronto!</>
            ) : (
              <>Recordatorio de renovación</>
            )}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-4">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  {daysUntilExpiration === 0
                    ? 'Tu suscripción expira hoy'
                    : daysUntilExpiration === 1
                    ? 'Tu suscripción expira mañana'
                    : `Tu suscripción expira en ${daysUntilExpiration} días`}
                </p>
                <p className="text-sm opacity-90 mt-1">
                  Como usas Mercado Pago, tu suscripción no se renueva automáticamente.
                  Necesitas realizar un nuevo pago para continuar disfrutando de las funcionalidades premium.
                </p>
              </div>
            </div>

            <Button
              onClick={handleRenew}
              variant={isUrgent ? 'default' : 'secondary'}
              className="w-full sm:w-auto gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Renovar ahora
            </Button>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
