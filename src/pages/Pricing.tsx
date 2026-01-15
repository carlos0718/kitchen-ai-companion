import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FAQSection } from '@/components/landing/FAQSection';
import { Check, Crown, Sparkles, ArrowRight, Star, TrendingDown, X, ChefHat, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
      description: 'Perfecto para comenzar',
      features: [
        { name: '15 consultas por semana', included: true },
        { name: 'Recetas básicas', included: true },
        { name: 'Historial limitado', included: true },
        { name: 'Planificador de comidas', included: false },
        { name: 'Recetas premium', included: false },
        { name: 'Soporte prioritario', included: false },
      ],
      icon: Sparkles,
      cta: 'Comenzar gratis',
    },
    {
      id: 'weekly' as const,
      name: 'Semanal',
      price: pricing.weekly.price,
      priceDisplay: pricing.weekly.display,
      period: '/semana',
      description: 'Ideal para probar todas las funcionalidades',
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
      cta: 'Comenzar ahora',
    },
    {
      id: 'monthly' as const,
      name: 'Mensual',
      price: pricing.monthly.price,
      priceDisplay: pricing.monthly.display,
      period: '/mes',
      description: 'El mejor valor para uso continuo',
      features: [
        { name: 'Consultas ilimitadas', included: true },
        { name: 'Todas las recetas', included: true },
        { name: 'Historial completo', included: true },
        { name: 'Planificador de comidas', included: true },
        { name: 'Recetas premium', included: true },
        { name: 'Soporte prioritario', included: true },
      ],
      icon: Crown,
      savings: 25,
      cta: 'Comenzar ahora',
    },
  ];
};

const FEATURE_COMPARISON = [
  { feature: 'Consultas de chat', free: '15/semana', weekly: 'Ilimitado', monthly: 'Ilimitado' },
  { feature: 'Planificador de comidas', free: false, weekly: true, monthly: true },
  { feature: 'Recetas premium', free: false, weekly: true, monthly: true },
  { feature: 'Guía nutricional personalizada', free: false, weekly: true, monthly: true },
  { feature: 'Historial', free: 'Limitado', weekly: 'Completo', monthly: 'Completo' },
  { feature: 'Soporte', free: 'Estándar', weekly: 'Prioritario', monthly: 'Prioritario' },
  { feature: 'Ahorro vs semanal', free: '-', weekly: '0%', monthly: '25%' },
];

export function Pricing() {
  const navigate = useNavigate();
  const { createCheckout, plan: currentPlan } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'ARS'>('USD');
  const [gateway, setGateway] = useState<'stripe' | 'mercadopago'>('stripe');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(undefined);
  const [detectingCountry, setDetectingCountry] = useState(true);

  // Detect country on component mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        setDetectingCountry(true);
        const { data, error } = await supabase.functions.invoke('detect-country');

        if (error) {
          console.error('Error detecting country:', error);
          setCurrency('USD');
          setGateway('stripe');
        } else {
          setCurrency(data.currency || 'USD');
          setGateway(data.gateway || 'stripe');
          if (data.exchangeRate) {
            setExchangeRate(data.exchangeRate);
          }
          console.log('[PRICING] Detected:', data);
        }
      } catch (error) {
        console.error('Error detecting country:', error);
        setCurrency('USD');
        setGateway('stripe');
      } finally {
        setDetectingCountry(false);
      }
    };

    detectCountry();
  }, []);

  const handleGetStarted = async (planId: 'free' | 'weekly' | 'monthly') => {
    if (planId === 'free') {
      navigate('/chat');
      return;
    }

    setLoading(planId);
    try {
      await createCheckout(planId);
    } catch (error) {
      toast.error('Error al procesar la suscripción', {
        description: 'Por favor intenta nuevamente o contacta a soporte.',
      });
    } finally {
      setLoading(null);
    }
  };

  // Get plans based on detected currency
  const PLANS = getPlans(currency);

  const weeklyCost = PLANS.find(p => p.id === 'weekly')?.price || 0;
  const monthlyCost = PLANS.find(p => p.id === 'monthly')?.price || 0;
  const monthlyEquivalentWeekly = weeklyCost * 4;
  const savings = monthlyEquivalentWeekly - monthlyCost;

  // Format savings for display
  const formatSavings = (amount: number) => {
    if (currency === 'ARS') {
      return `$${amount.toLocaleString('es-AR')}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-background via-background to-accent/5">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-6 bg-gradient-to-r from-primary to-purple-600">
              <ChefHat className="h-3 w-3 mr-1" />
              Kitchen AI Companion
            </Badge>
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Planes que se adaptan a tus necesidades
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Elige el plan perfecto para tu viaje culinario. Sin compromisos, cancela cuando quieras.
            </p>

            {/* Payment Gateway Badge */}
            {!detectingCountry && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-center gap-2 mb-6"
              >
                <Badge variant="outline" className="gap-1.5">
                  <CreditCard className="h-3 w-3" />
                  Mercado Pago
                </Badge>
                <Badge variant="secondary">
                  {currency === 'ARS' ? 'Precios en Pesos Argentinos' : 'Precios en USD'}
                </Badge>
              </motion.div>
            )}

            {/* Savings Highlight */}
            {!detectingCountry && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-full mb-12"
              >
                <TrendingDown className="h-5 w-5 text-amber-600" />
                <p className="font-semibold">
                  ¡Ahorra {formatSavings(savings)}/mes con el plan mensual!
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Plan Cards */}
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {PLANS.map((plan, index) => {
              const Icon = plan.icon;
              const isCurrent = currentPlan === plan.id;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                >
                  <Card
                    className={`relative h-full ${
                      plan.popular ? 'border-primary shadow-2xl ring-2 ring-primary/20 scale-105' : ''
                    } ${isCurrent ? 'bg-accent/30' : ''} transition-all hover:shadow-xl`}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
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
                      <Badge variant="secondary" className="absolute -top-3 right-4">
                        Tu plan actual
                      </Badge>
                    )}

                    <CardHeader className="text-center pb-4 pt-8">
                      <div
                        className={`mx-auto w-16 h-16 rounded-full ${
                          plan.popular
                            ? 'bg-gradient-to-br from-primary to-purple-600'
                            : 'bg-primary/10'
                        } flex items-center justify-center mb-4 shadow-md`}
                      >
                        <Icon className={`h-8 w-8 ${plan.popular ? 'text-white' : 'text-primary'}`} />
                      </div>
                      <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                      <CardDescription className="text-sm mb-4">{plan.description}</CardDescription>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-bold text-foreground">{plan.priceDisplay}</span>
                        <span className="text-muted-foreground text-lg">{plan.period}</span>
                      </div>
                      {plan.id === 'monthly' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {currency === 'ARS'
                            ? `$${Math.round(monthlyCost / 4).toLocaleString('es-AR')}/semana`
                            : `$${(monthlyCost / 4).toFixed(2)}/semana`
                          }
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + idx * 0.05 }}
                            className="flex items-start gap-3"
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

                      <Button
                        className={`w-full ${
                          plan.popular
                            ? 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90'
                            : ''
                        }`}
                        variant={plan.id === 'free' ? 'outline' : 'default'}
                        onClick={() => handleGetStarted(plan.id)}
                        disabled={loading !== null || (isCurrent && plan.id !== 'free')}
                      >
                        {isCurrent && plan.id !== 'free' ? (
                          'Plan Actual'
                        ) : (
                          <>
                            {plan.cta}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 px-4 bg-accent/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">Comparación Detallada</h2>
            <p className="text-lg text-muted-foreground">
              Todas las características de nuestros planes, lado a lado
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-accent/50">
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Característica</th>
                        <th className="text-center p-4 font-semibold">Gratis</th>
                        <th className="text-center p-4 font-semibold bg-primary/10">
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
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
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
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="p-12 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-2xl border border-primary/20">
            <h2 className="text-4xl font-serif font-bold mb-4">
              ¿Listo para transformar tu experiencia culinaria?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Únete a miles de usuarios que ya disfrutan de Kitchen AI Companion
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => handleGetStarted('weekly')}
                disabled={loading !== null}
                variant="outline"
                className="text-lg px-8"
              >
                Comenzar con Plan Semanal
              </Button>
              <Button
                size="lg"
                onClick={() => handleGetStarted('monthly')}
                disabled={loading !== null}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-lg px-8"
              >
                Comenzar con Plan Mensual
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Sin compromisos. Cancela cuando quieras.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">🍳</span>
            </div>
            <div className="text-left">
              <h3 className="font-serif text-lg font-semibold">Kitchen AI</h3>
              <p className="text-xs text-muted-foreground">Companion</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Kitchen AI Companion. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Pricing;
