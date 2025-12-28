import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionState {
  subscribed: boolean;
  plan: 'free' | 'weekly' | 'monthly';
  subscriptionEnd: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  loading: boolean;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: 'free',
    subscriptionEnd: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    loading: true,
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

      setState({
        subscribed: response.data.subscribed,
        plan: response.data.plan || 'free',
        subscriptionEnd: response.data.subscription_end,
        currentPeriodStart: response.data.current_period_start,
        currentPeriodEnd: response.data.current_period_end,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkSubscription();
    
    // Refresh every minute
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const createCheckout = async (plan: 'weekly' | 'monthly') => {
    try {
      const response = await supabase.functions.invoke('create-checkout', {
        body: { plan },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw error;
    }
  };

  const openCustomerPortal = async () => {
    try {
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
