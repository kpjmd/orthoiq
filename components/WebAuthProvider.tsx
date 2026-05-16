'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface WebUser {
  id: string;
  email?: string;
  name?: string;
  authType: 'email' | 'guest' | 'verified' | 'wallet';
  emailVerified: boolean;
  dailyQuestionCount?: number;
  walletAddress?: string;
  walletVerified?: boolean;
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
  refreshUser: () => Promise<void>;
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

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    try {
      // Session is validated via httpOnly cookie — no Authorization header needed
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const hasEmail = !!data.user.email;
        const verifiedUser: WebUser = {
          id: data.user.id,
          email: data.user.email ?? undefined,
          name: hasEmail
            ? data.user.email.split('@')[0]
            : data.user.walletAddress
            ? `${data.user.walletAddress.slice(0, 6)}...${data.user.walletAddress.slice(-4)}`
            : undefined,
          authType: hasEmail ? 'verified' : 'wallet',
          emailVerified: data.user.emailVerified,
          dailyQuestionCount: data.user.dailyQuestionCount,
          walletAddress: data.user.walletAddress ?? undefined,
          walletVerified: !!data.user.walletVerified,
        };
        setUser(verifiedUser);
        setMagicLinkSent(false);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle auth_success redirect after magic link click
  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      const authSuccess = params.get('auth_success');
      const authError = params.get('auth_error');

      if (authSuccess === 'true') {
        await checkSession();
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('auth_success');
        window.history.replaceState({}, '', newUrl.toString());
      }

      if (authError) {
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

  const signInWithEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setMagicLinkSent(false);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: 'Please enter a valid email address' };
      }

      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.error || 'Failed to send verification email' };
      }

      // Show pending state in memory only — not persisted to localStorage
      setUser({
        id: `pending_${Date.now()}`,
        email: email.toLowerCase(),
        name: email.split('@')[0],
        authType: 'email',
        emailVerified: false
      });
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
    setUser({
      id: `guest_${Date.now()}`,
      name: 'Guest User',
      authType: 'guest',
      emailVerified: false
    });
  };

  const upgradeToEmail = async (email: string) => signInWithEmail(email);

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(console.error);
    } finally {
      setUser(null);
      setMagicLinkSent(false);
    }
  };

  const value: WebAuthContextType = {
    user,
    isAuthenticated: !!user,
    isVerified: user?.emailVerified === true || user?.walletVerified === true,
    signInWithEmail,
    signInAsGuest,
    upgradeToEmail,
    signOut,
    isLoading,
    magicLinkSent,
    checkSession,
    refreshUser: checkSession,
  };

  return (
    <WebAuthContext.Provider value={value}>
      {children}
    </WebAuthContext.Provider>
  );
}
