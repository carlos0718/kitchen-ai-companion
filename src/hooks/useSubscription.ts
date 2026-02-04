import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionState {
  subscribed: boolean;
  plan: 'free' | 'weekly' | 'monthly';
  status: string | null;
  subscriptionEnd: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  loading: boolean;
  // Payment gateway info
  paymentGateway: 'stripe' | 'mercadopago' | null;
  isRecurring: boolean;
  daysUntilExpiration: number | null;
  // Computed states
  isPastDue: boolean;
  isCanceling: boolean;
  canUsePremiumFeatures: boolean;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: 'free',
    status: null,
    subscriptionEnd: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEnd: null,
    loading: true,
    paymentGateway: null,
    isRecurring: true,
    daysUntilExpiration: null,
    isPastDue: false,
    isCanceling: false,
    canUsePremiumFeatures: false,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const response = await supabase.functions.invoke('check-subscription');
      
      if (response.error) {
        console.error('Error checking subscription:', response.error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const status = response.data.status || null;
      const subscribed = response.data.subscribed;
      const plan = response.data.plan || 'free';
      const cancelAtPeriodEnd = response.data.cancel_at_period_end || false;
      const paymentGateway = response.data.payment_gateway || null;
      const isRecurring = response.data.is_recurring !== false; // Default to true for Stripe
      const daysUntilExpiration = response.data.days_until_expiration || null;

      // Compute derived states
      const isPastDue = status === 'past_due';
      const isCanceling = cancelAtPeriodEnd && status === 'active';
      const canUsePremiumFeatures = subscribed && !isPastDue && status !== 'unpaid';

      setState({
        subscribed,
        plan,
        status,
        subscriptionEnd: response.data.subscription_end,
        currentPeriodStart: response.data.current_period_start,
        currentPeriodEnd: response.data.current_period_end,
        cancelAtPeriodEnd,
        trialEnd: response.data.trial_end || null,
        loading: false,
        paymentGateway,
        isRecurring,
        daysUntilExpiration,
        isPastDue,
        isCanceling,
        canUsePremiumFeatures,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkSubscription();

    // Reduce polling to 5 minutes since webhooks handle real-time updates
    const interval = setInterval(checkSubscription, 300000);

    // Refresh subscription when user returns to the tab (e.g., after MercadoPago payment)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSubscription();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refresh on window focus (backup for visibility change)
    const handleFocus = () => {
      checkSubscription();
    };
    window.addEventListener('focus', handleFocus);

    // Set up Realtime subscription for instant updates
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then((result) => {
      if (!result.data.session?.user?.id) return;

      const userId = result.data.session.user.id;

      channel = supabase
        .channel('user-subscription-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            // Refresh subscription data when changes are detected
            checkSubscription();
          }
        )
        .subscribe();
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [checkSubscription]);

  const createCheckout = async (plan: 'weekly' | 'monthly', mercadoPagoEmail?: string) => {
    try {
      // Detect user's country and appropriate payment gateway
      const detectionResponse = await supabase.functions.invoke('detect-country');

      if (detectionResponse.error) {
        console.error('Error detecting country:', detectionResponse.error);
      }

      // Check if payment is available in this country
      const isAvailable = detectionResponse.data?.available !== false;
      if (!isAvailable) {
        throw new Error('Los pagos solo están disponibles en Argentina por el momento. Estamos trabajando para expandirnos a más países.');
      }

      const gateway = detectionResponse.data?.gateway;

      if (gateway === 'mercadopago') {
        // Use Mercado Pago Subscriptions API (recurring payments)
        const response = await supabase.functions.invoke('mercadopago-create-subscription', {
          body: { plan, mercadoPagoEmail },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data?.init_point) {
          window.open(response.data.init_point, '_blank');
        }
      } else {
        // Payment gateway not available
        throw new Error('No hay método de pago disponible para tu ubicación.');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw error;
    }
  };

  const openCustomerPortal = async () => {
    try {
      // Customer portal is only available for Stripe users
      if (state.paymentGateway === 'mercadopago') {
        throw new Error('El portal de clientes no está disponible para Mercado Pago. Renueva tu suscripción desde la página de precios.');
      }

      const response = await supabase.functions.invoke('customer-portal');

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      throw error;
    }
  };

  const getMealPlanningDateRange = useCallback(() => {
    if (!state.subscribed || !state.currentPeriodStart || !state.currentPeriodEnd) {
      return null;
    }

    const startDate = new Date(state.currentPeriodStart);
    const endDate = new Date(state.currentPeriodEnd);

    return {
      startDate,
      endDate,
      daysRemaining: Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    };
  }, [state.subscribed, state.currentPeriodStart, state.currentPeriodEnd]);

  const canGenerateMealPlanForDate = useCallback((targetDate: Date): boolean => {
    if (!state.subscribed) {
      return false;
    }

    const range = getMealPlanningDateRange();
    if (!range) {
      return false;
    }

    // Normalize dates to start of day (00:00:00) for fair comparison
    const targetDateOnly = new Date(targetDate);
    targetDateOnly.setHours(0, 0, 0, 0);

    const rangeStartOnly = new Date(range.startDate);
    rangeStartOnly.setHours(0, 0, 0, 0);

    const rangeEndOnly = new Date(range.endDate);
    rangeEndOnly.setHours(0, 0, 0, 0);

    // User can generate meal plans for ANY date within their subscription period
    // Weekly: 7 days from subscription date
    // Monthly: 30 days from subscription date
    return targetDateOnly >= rangeStartOnly && targetDateOnly <= rangeEndOnly;
  }, [state.subscribed, getMealPlanningDateRange]);

  // Check if ANY day in a week overlaps with subscription period
  // Used for "Generate Week" button validation
  const canGenerateWeekPlan = useCallback((weekStart: Date, weekEnd: Date): boolean => {
    if (!state.subscribed) {
      return false;
    }

    const range = getMealPlanningDateRange();
    if (!range) {
      return false;
    }

    // Normalize dates
    const weekStartOnly = new Date(weekStart);
    weekStartOnly.setHours(0, 0, 0, 0);

    const weekEndOnly = new Date(weekEnd);
    weekEndOnly.setHours(23, 59, 59, 999);

    const rangeStartOnly = new Date(range.startDate);
    rangeStartOnly.setHours(0, 0, 0, 0);

    const rangeEndOnly = new Date(range.endDate);
    rangeEndOnly.setHours(23, 59, 59, 999);

    // Check if there's ANY overlap between the week and subscription period
    // Overlap exists if: weekStart <= subscriptionEnd AND weekEnd >= subscriptionStart
    return weekStartOnly <= rangeEndOnly && weekEndOnly >= rangeStartOnly;
  }, [state.subscribed, getMealPlanningDateRange]);

  const cancelSubscription = async () => {
    try {
      const response = await supabase.functions.invoke('cancel-subscription');

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Refresh subscription status
      await checkSubscription();

      return response.data;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  };

  return {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    cancelSubscription,
    getMealPlanningDateRange,
    canGenerateMealPlanForDate,
    canGenerateWeekPlan,
  };
}
