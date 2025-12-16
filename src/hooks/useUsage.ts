import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UsageState {
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  canQuery: boolean;
  loading: boolean;
}

export function useUsage() {
  const [state, setState] = useState<UsageState>({
    currentCount: 0,
    dailyLimit: 10,
    remaining: 10,
    canQuery: true,
    loading: true,
  });

  const checkUsage = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const response = await supabase.functions.invoke('check-usage');
      
      if (response.error) {
        console.error('Error checking usage:', response.error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      setState({
        currentCount: response.data.current_count,
        dailyLimit: response.data.daily_limit,
        remaining: response.data.remaining,
        canQuery: response.data.can_query,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking usage:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkUsage();
  }, [checkUsage]);

  const incrementUsage = useCallback(async () => {
    try {
      await supabase.functions.invoke('increment-usage');
      // Update local state optimistically
      setState(prev => ({
        ...prev,
        currentCount: prev.currentCount + 1,
        remaining: Math.max(0, prev.remaining - 1),
        canQuery: prev.remaining - 1 > 0,
      }));
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }, []);

  return {
    ...state,
    checkUsage,
    incrementUsage,
  };
}
