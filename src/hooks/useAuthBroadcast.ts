import { useEffect, useRef } from 'react';

const AUTH_CHANNEL_NAME = 'kitchen-ai-auth';

interface AuthBroadcastMessage {
  type: 'AUTH_CONFIRMED' | 'SIGNED_OUT';
  userId?: string;
}

/**
 * Hook for cross-tab authentication communication.
 * When a user confirms their email in a new tab, this broadcasts
 * to other tabs so they can update their auth state.
 */
export function useAuthBroadcast(onAuthConfirmed?: () => void) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    // Create the broadcast channel
    channelRef.current = new BroadcastChannel(AUTH_CHANNEL_NAME);

    // Listen for messages from other tabs
    channelRef.current.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      if (event.data.type === 'AUTH_CONFIRMED') {
        // Another tab confirmed auth, trigger callback to refresh state
        onAuthConfirmed?.();
      }
    };

    return () => {
      channelRef.current?.close();
    };
  }, [onAuthConfirmed]);

  // Function to broadcast auth confirmation to other tabs
  const broadcastAuthConfirmed = (userId?: string) => {
    channelRef.current?.postMessage({
      type: 'AUTH_CONFIRMED',
      userId,
    } as AuthBroadcastMessage);
  };

  // Function to broadcast sign out to other tabs
  const broadcastSignOut = () => {
    channelRef.current?.postMessage({
      type: 'SIGNED_OUT',
    } as AuthBroadcastMessage);
  };

  return {
    broadcastAuthConfirmed,
    broadcastSignOut,
  };
}

// Check for email confirmation IMMEDIATELY when module loads (before Supabase cleans URL)
const CONFIRMATION_KEY = 'kitchen-ai-email-confirmation';

function checkAndStoreConfirmation(): boolean {
  // First check if we already determined this is a confirmation tab
  const stored = sessionStorage.getItem(CONFIRMATION_KEY);
  if (stored === 'true') {
    return true;
  }

  const hash = window.location.hash;
  const search = window.location.search;

  // Check for Supabase auth tokens in URL
  const isConfirmation = (
    hash.includes('access_token') ||
    hash.includes('refresh_token') ||
    search.includes('token_hash') ||
    search.includes('type=signup') ||
    search.includes('type=email') ||
    search.includes('type=recovery')
  );

  if (isConfirmation) {
    // Store in sessionStorage so it persists even after URL is cleaned
    sessionStorage.setItem(CONFIRMATION_KEY, 'true');
  }

  return isConfirmation;
}

// Run check immediately when module loads
const isConfirmationOnLoad = checkAndStoreConfirmation();

/**
 * Checks if the current page was opened from an email confirmation link.
 * This uses a stored value since Supabase cleans the URL tokens quickly.
 */
export function isEmailConfirmationRedirect(): boolean {
  return isConfirmationOnLoad || sessionStorage.getItem(CONFIRMATION_KEY) === 'true';
}

/**
 * Clears the confirmation flag (call this when user navigates away intentionally)
 */
export function clearConfirmationFlag(): void {
  sessionStorage.removeItem(CONFIRMATION_KEY);
}

/**
 * Attempts to close the current tab. This only works if the tab
 * was opened by JavaScript (window.open). For email links, it will
 * fail silently and we'll redirect instead.
 */
export function tryCloseTab(): boolean {
  try {
    window.close();
    // If we're still here after a short delay, the close didn't work
    return false;
  } catch {
    return false;
  }
}
