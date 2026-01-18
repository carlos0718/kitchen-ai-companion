import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Crown, Sparkles, Loader2, X, TrendingDown, Star, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: 'free' | 'weekly' | 'monthly';
  onSubscribe: (plan: 'weekly' | 'monthly') => Promise<void>;
  onManage: () => Promise<void>;
}

const getPricing = (currency: 'USD' | 'ARS', exchangeRate?: number) => {
  if (currency === 'ARS' && exchangeRate) {
    // Calculate prices based on USD prices × MEP exchange rate
    const weeklyARS = Math.round(4.99 * exchangeRate);
    const monthlyARS = Math.round(14.99 * exchangeRate);

    return {
      weekly: {
        price: weeklyARS,
        display: `$${weeklyARS.toLocaleString('es-AR')}`
      },
      monthly: {
        price: monthlyARS,
        display: `$${monthlyARS.toLocaleString('es-AR')}`
      },
    };
  }
  return {
    weekly: { price: 4.99, display: '$4.99' },
    monthly: { price: 14.99, display: '$14.99' },
  };
};

const getPlans = (currency: 'USD' | 'ARS', exchangeRate?: number) => {
  const pricing = getPricing(currency, exchangeRate);

  return [
    {
      id: 'free' as const,
      name: 'Gratis',
      price: 0,
      priceDisplay: '$0',
      period: '',
      features: [
        { name: '15 consultas por semana', included: true },
        { name: 'Recetas básicas', included: true },
        { name: 'Historial limitado', included: true },
        { name: 'Planificador de comidas', included: false },
        { name: 'Recetas premium', included: false },
        { name: 'Soporte prioritario', included: false },
      ],
      icon: Sparkles,
    },
    {
      id: 'weekly' as const,
      name: 'Semanal',
      price: pricing.weekly.price,
      priceDisplay: pricing.weekly.display,
      period: '/semana',
      features: [
        { name: 'Consultas ilimitadas', included: true },
        { name: 'Todas las recetas', included: true },
        { name: 'Historial completo', included: true },
        { name: 'Planificador de comidas', included: true },
        { name: 'Recetas premium', included: true },
        { name: 'Soporte prioritario', included: true },
      ],
      icon: Crown,
      popular: true,
    },
    {
      id: 'monthly' as const,
      name: 'Mensual',
      price: pricing.monthly.price,
      priceDisplay: pricing.monthly.display,
      period: '/mes',
      features: [
        { name: 'Consultas ilimitadas', included: true },
        { name: 'Todas las recetas', included: true },
        { name: 'Historial completo', included: true },
        { name: 'Planificador de comidas', included: true },
        { name: 'Recetas premium', included: true },
        { name: 'Soporte prioritario', included: true },
      ],
      icon: Crown,
      badge: 'Mejor Valor',
      savings: 25,
    },
  ];
};

// Feature comparison data
const FEATURE_COMPARISON = [
  { feature: 'Consultas de chat', free: '15/semana', weekly: 'Ilimitado', monthly: 'Ilimitado' },
  { feature: 'Planificador de comidas', free: false, weekly: true, monthly: true },
  { feature: 'Recetas premium', free: false, weekly: true, monthly: true },
  { feature: 'Historial', free: 'Limitado', weekly: 'Completo', monthly: 'Completo' },
  { feature: 'Soporte', free: 'Estándar', weekly: 'Prioritario', monthly: 'Prioritario' },
  { feature: 'Ahorro vs semanal', free: '-', weekly: '0%', monthly: '25%' },
];

export function SubscriptionModal({
  open,
  onOpenChange,
  currentPlan,
  onSubscribe,
  onManage,
}: SubscriptionModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'ARS'>('ARS');
  const [gateway, setGateway] = useState<'stripe' | 'mercadopago'>('mercadopago');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(undefined);
  const [detectingCountry, setDetectingCountry] = useState(true);

  // Detect country and payment gateway when modal opens
  useEffect(() => {
    if (!open) return;

    const detectCountry = async () => {
      try {
        setDetectingCountry(true);
        const { data, error } = await supabase.functions.invoke('detect-country');

        if (error) {
          console.error('Error detecting country:', error);
          // Default to ARS/Mercado Pago
          setCurrency('ARS');
          setGateway('mercadopago');
        } else {
          setCurrency(data.currency || 'ARS');
          setGateway(data.gateway || 'mercadopago');
          if (data.exchangeRate) {
            setExchangeRate(data.exchangeRate);
          }
        }
      } catch (error) {
        console.error('Error detecting country:', error);
        setCurrency('ARS');
        setGateway('mercadopago');
      } finally {
        setDetectingCountry(false);
      }
    };

    detectCountry();
  }, [open]);

  // Check for query parameters
  useEffect(() => {
    if (!open) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setShowSuccess(true);
      toast.success('¡Suscripción creada exitosamente!', {
        description: 'Ya puedes disfrutar de todas las funcionalidades premium.',
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      setShowCanceled(true);
      toast.info('Suscripción cancelada', {
        description: 'Puedes intentar nuevamente cuando quieras.',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [open]);

  const handleSubscribe = async (planId: 'weekly' | 'monthly') => {
    setLoading(planId);
    try {
      await onSubscribe(planId);
    } catch (error) {
      toast.error('Error al procesar la suscripción', {
        description: 'Por favor intenta nuevamente o contacta a soporte.',
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
      toast.error('Error al abrir el portal', {
        description: 'No se pudo abrir el portal de gestión.',
      });
    } finally {
      setLoading(null);
    }
  };

  // Get plans based on detected currency and exchange rate
  const PLANS = getPlans(currency, exchangeRate);

  // Calculate savings
  const weeklyCost = PLANS.find(p => p.id === 'weekly')?.price || 0;
  const monthlyCost = PLANS.find(p => p.id === 'monthly')?.price || 0;
  const monthlyEquivalentWeekly = weeklyCost * 4;
  const savings = monthlyEquivalentWeekly - monthlyCost;
  const savingsPercentage = Math.round((savings / monthlyEquivalentWeekly) * 100);

  // Format savings for display
  const formatSavings = (amount: number) => {
    if (currency === 'ARS') {
      return `$${amount.toLocaleString('es-AR')}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-serif bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Planes de Suscripción
          </DialogTitle>
          <DialogDescription className="text-base">
            Elige el plan que mejor se adapte a tus necesidades culinarias
          </DialogDescription>
          {!detectingCountry && (
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className="gap-1.5">
                <CreditCard className="h-3 w-3" />
                Mercado Pago
              </Badge>
              <Badge variant="secondary">
                {currency === 'ARS' ? 'Precios en Pesos Argentinos' : 'Precios en USD'}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {/* Success/Canceled Alerts */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert className="bg-primary/10 border-primary/30">
                <Check className="h-4 w-4 text-primary" />
                <AlertDescription>
                  ¡Bienvenido al plan premium! Tu suscripción está activa.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
          {showCanceled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert>
                <AlertDescription>
                  No te preocupes, puedes suscribirte cuando quieras.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Planes</TabsTrigger>
            <TabsTrigger value="comparison">Comparación</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="mt-6">
            {/* Savings Banner */}
            {currentPlan === 'free' && !detectingCountry && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-foreground">
                      ¡Ahorra {formatSavings(savings)} por mes!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      El plan mensual te ahorra {savingsPercentage}% comparado con pagar semanalmente
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
              {PLANS.map((plan, index) => {
                const Icon = plan.icon;
                const isCurrent = currentPlan === plan.id;
                const isPaid = plan.id !== 'free';

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className={`relative h-full ${
                        plan.popular ? 'border-primary shadow-2xl ring-2 ring-primary/20' : ''
                      } ${isCurrent ? 'bg-accent/30' : ''} transition-all hover:shadow-lg`}
                    >
                      {/* Popular Badge with animation */}
                      {plan.popular && (
                        <motion.div
                          animate={{
                            scale: [1, 1.05, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: 'reverse',
                          }}
                        >
                          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg">
                            <Star className="h-3 w-3 mr-1" />
                            Más Popular
                          </Badge>
                        </motion.div>
                      )}

                      {/* Savings Badge */}
                      {'savings' in plan && plan.savings && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Ahorra {plan.savings}%
                        </Badge>
                      )}

                      {/* Current Plan Badge */}
                      {isCurrent && (
                        <Badge variant="secondary" className="absolute -top-3 right-2">
                          Tu plan actual
                        </Badge>
                      )}

                      <CardHeader className="text-center pb-4">
                        <div className={`mx-auto w-16 h-16 rounded-full ${
                          plan.popular
                            ? 'bg-gradient-to-br from-primary to-purple-600'
                            : 'bg-primary/10'
                        } flex items-center justify-center mb-3 shadow-md`}>
                          <Icon className={`h-8 w-8 ${plan.popular ? 'text-white' : 'text-primary'}`} />
                        </div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription className="mt-2">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold text-foreground">{plan.priceDisplay}</span>
                            <span className="text-muted-foreground text-lg">{plan.period}</span>
                          </div>
                          {plan.id === 'monthly' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {currency === 'ARS'
                                ? `$${Math.round(monthlyCost / 4).toLocaleString('es-AR')}/semana`
                                : `$${(monthlyCost / 4).toFixed(2)}/semana`
                              }
                            </p>
                          )}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <ul className="space-y-3">
                          {plan.features.map((feature, idx) => (
                            <motion.li
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 + idx * 0.05 }}
                              className="flex items-start gap-2"
                            >
                              {feature.included ? (
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              )}
                              <span className={feature.included ? '' : 'text-muted-foreground line-through'}>
                                {feature.name}
                              </span>
                            </motion.li>
                          ))}
                        </ul>

                        <div className="pt-4">
                          {isCurrent && isPaid ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={handleManage}
                              disabled={loading === 'manage'}
                            >
                              {loading === 'manage' ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Cargando...
                                </>
                              ) : (
                                'Gestionar Suscripción'
                              )}
                            </Button>
                          ) : isCurrent ? (
                            <Button variant="secondary" className="w-full" disabled>
                              Plan Actual
                            </Button>
                          ) : isPaid ? (
                            <Button
                              className={`w-full ${
                                plan.popular
                                  ? 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90'
                                  : ''
                              }`}
                              onClick={() => handleSubscribe(plan.id as 'weekly' | 'monthly')}
                              disabled={loading !== null}
                            >
                              {loading === plan.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Procesando...
                                </>
                              ) : (
                                <>
                                  Suscribirse
                                  {plan.popular && <Star className="h-4 w-4 ml-2" />}
                                </>
                              )}
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Comparación de Características</CardTitle>
                <CardDescription>
                  Compara todas las características de nuestros planes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Característica</th>
                        <th className="text-center p-4 font-semibold">Gratis</th>
                        <th className="text-center p-4 font-semibold bg-primary/5">
                          <div className="flex items-center justify-center gap-2">
                            Semanal
                            <Star className="h-4 w-4 text-primary" />
                          </div>
                        </th>
                        <th className="text-center p-4 font-semibold">Mensual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURE_COMPARISON.map((row, idx) => (
                        <motion.tr
                          key={idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="border-b hover:bg-accent/50 transition-colors"
                        >
                          <td className="p-4 font-medium">{row.feature}</td>
                          <td className="text-center p-4">
                            {typeof row.free === 'boolean' ? (
                              row.free ? (
                                <Check className="h-5 w-5 text-primary mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground mx-auto" />
                              )
                            ) : (
                              <span className="text-muted-foreground">{row.free}</span>
                            )}
                          </td>
                          <td className="text-center p-4 bg-primary/5">
                            {typeof row.weekly === 'boolean' ? (
                              row.weekly ? (
                                <Check className="h-5 w-5 text-primary mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground mx-auto" />
                              )
                            ) : (
                              <span className="font-semibold">{row.weekly}</span>
                            )}
                          </td>
                          <td className="text-center p-4">
                            {typeof row.monthly === 'boolean' ? (
                              row.monthly ? (
                                <Check className="h-5 w-5 text-primary mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground mx-auto" />
                              )
                            ) : (
                              <span className="font-semibold">{row.monthly}</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* CTA Section */}
                {currentPlan === 'free' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 p-6 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-lg border border-primary/20"
                  >
                    <h3 className="text-lg font-semibold mb-2">
                      ¿Listo para comenzar?
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Desbloquea todas las funcionalidades premium y lleva tu experiencia culinaria al siguiente nivel.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleSubscribe('weekly')}
                        disabled={loading !== null}
                        variant="outline"
                      >
                        {loading === 'weekly' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Plan Semanal
                      </Button>
                      <Button
                        onClick={() => handleSubscribe('monthly')}
                        disabled={loading !== null}
                        className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                      >
                        {loading === 'monthly' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Plan Mensual
                        <TrendingDown className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Note */}
        <p className="text-xs text-center text-muted-foreground mt-4">
          Puedes cancelar tu suscripción en cualquier momento desde el portal de gestión.
        </p>
      </DialogContent>
    </Dialog>
  );
}
