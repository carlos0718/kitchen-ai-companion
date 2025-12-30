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
          (payload) => {
            console.log('[REALTIME] Subscription changed:', payload);
            // Refresh subscription data when changes are detected
            checkSubscription();
          }
        )
        .subscribe();
    });

    return () => {
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [checkSubscription]);

  const createCheckout = async (plan: 'weekly' | 'monthly') => {
    try {
      // Detect user's country and appropriate payment gateway
      const detectionResponse = await supabase.functions.invoke('detect-country');

      if (detectionResponse.error) {
        console.error('Error detecting country:', detectionResponse.error);
        // Default to Stripe if detection fails
      }

      const gateway = detectionResponse.data?.gateway || 'stripe';
      console.log('[CHECKOUT] Using payment gateway:', gateway);

      if (gateway === 'mercadopago') {
        // Use Mercado Pago for Argentina
        const response = await supabase.functions.invoke('mercadopago-create-preference', {
          body: { plan },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data?.init_point) {
          window.open(response.data.init_point, '_blank');
        }
      } else {
        // Use Stripe for international users
        const response = await supabase.functions.invoke('create-checkout', {
          body: { plan },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data?.url) {
          window.open(response.data.url, '_blank');
        }
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
    if (!state.subscribed) return false;

    const range = getMealPlanningDateRange();
    if (!range) return false;

    const targetTime = targetDate.getTime();
    const now = new Date().getTime();

    // Can only plan for future/current dates
    if (targetTime < now - (24 * 60 * 60 * 1000)) return false;

    // Must be within subscription period
    return targetTime >= range.startDate.getTime() && targetTime <= range.endDate.getTime();
  }, [state.subscribed, getMealPlanningDateRange]);

  return {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    getMealPlanningDateRange,
    canGenerateMealPlanForDate,
  };
}
