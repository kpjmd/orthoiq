'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Extended WebUser interface with verification status
interface WebUser {
  id: string;
  email?: string;
  name?: string;
  authType: 'email' | 'guest' | 'verified';
  emailVerified: boolean;
  dailyQuestionCount?: number;
  sessionToken?: string;
}

interface WebAuthContextType {
  user: WebUser | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  signInWithEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  signInAsGuest: () => void;
  upgradeToEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  magicLinkSent: boolean;
  checkSession: () => Promise<void>;
}

const WebAuthContext = createContext<WebAuthContextType | null>(null);

export function useWebAuth() {
  const context = useContext(WebAuthContext);
  if (!context) {
    throw new Error('useWebAuth must be used within a WebAuthProvider');
  }
  return context;
}

export function WebAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WebUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check for existing session on load
  const checkSession = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check localStorage for session token
      const savedUser = localStorage.getItem('orthoiq_web_user');
      const sessionToken = localStorage.getItem('orthoiq_session_token');

      // Always call session API with credentials to check both cookie and header auth
      // This handles magic link flow (cookie) and returning users (localStorage)
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include', // Important: include cookies for magic link flow
        headers: sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}
      });

      if (response.ok) {
        const data = await response.json();

        // Store session token from response (in case it came from cookie)
        if (data.sessionToken) {
          localStorage.setItem('orthoiq_session_token', data.sessionToken);
        }

        const verifiedUser: WebUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.email?.split('@')[0],
          authType: 'verified',
          emailVerified: data.user.emailVerified,
          dailyQuestionCount: data.user.dailyQuestionCount,
          sessionToken: data.sessionToken || sessionToken
        };
        setUser(verifiedUser);
        setMagicLinkSent(false); // Clear magic link sent state after successful verification
        localStorage.setItem('orthoiq_web_user', JSON.stringify(verifiedUser));
      } else {
        // Session invalid, clear local storage
        localStorage.removeItem('orthoiq_session_token');
        localStorage.removeItem('orthoiq_web_user');

        // Check if we have a saved verified user (stale session)
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            // Don't restore - require fresh auth
            if (parsedUser.authType !== 'guest') {
              localStorage.removeItem('orthoiq_web_user');
            }
          } catch {
            localStorage.removeItem('orthoiq_web_user');
          }
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check for auth success/error in URL params (after magic link redirect)
  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      const authSuccess = params.get('auth_success');
      const authError = params.get('auth_error');

      if (authSuccess === 'true') {
        // Get session from cookie (set by verify-magic-link route)
        // The session token should be in the cookie, we need to refresh
        await checkSession();

        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('auth_success');
        window.history.replaceState({}, '', newUrl.toString());
      }

      if (authError) {
        console.error('Auth error:', authError);
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('auth_error');
        window.history.replaceState({}, '', newUrl.toString());
      }
    };

    handleAuthRedirect();
  }, [checkSession]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Send magic link email for authentication
  const signInWithEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setMagicLinkSent(false);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: 'Please enter a valid email address' };
      }

      // Send magic link via API
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.toLowerCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.error || 'Failed to send verification email' };
      }

      // Store pending email for display purposes
      const pendingUser: WebUser = {
        id: `pending_${Date.now()}`,
        email: email.toLowerCase(),
        name: email.split('@')[0],
        authType: 'email',
        emailVerified: false
      };
      setUser(pendingUser);
      localStorage.setItem('orthoiq_web_user', JSON.stringify(pendingUser));
      setMagicLinkSent(true);

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Email sign-in failed:', error);
      return { success: false, message: 'An unexpected error occurred. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsGuest = () => {
    const guestUser: WebUser = {
      id: `guest_${Date.now()}`,
      name: 'Guest User',
      authType: 'guest',
      emailVerified: false
    };

    setUser(guestUser);
    localStorage.setItem('orthoiq_web_user', JSON.stringify(guestUser));
  };

  const upgradeToEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    // Use signInWithEmail to send magic link
    return signInWithEmail(email);
  };

  const signOut = async () => {
    try {
      const sessionToken = localStorage.getItem('orthoiq_session_token');

      if (sessionToken) {
        // Call logout API to invalidate session
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        }).catch(console.error);
      }
    } finally {
      setUser(null);
      setMagicLinkSent(false);
      localStorage.removeItem('orthoiq_web_user');
      localStorage.removeItem('orthoiq_session_token');
    }
  };

  const value: WebAuthContextType = {
    user,
    isAuthenticated: !!user,
    isVerified: user?.emailVerified === true,
    signInWithEmail,
    signInAsGuest,
    upgradeToEmail,
    signOut,
    isLoading,
    magicLinkSent,
    checkSession,
  };

  return (
    <WebAuthContext.Provider value={value}>
      {children}
    </WebAuthContext.Provider>
  );
}
