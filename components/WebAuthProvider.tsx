'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WebUser {
  id: string;
  email?: string;
  name?: string;
  authType: 'email' | 'guest';
}

interface WebAuthContextType {
  user: WebUser | null;
  isAuthenticated: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signInAsGuest: () => void;
  upgradeToEmail: (email: string) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing session on load
  useEffect(() => {
    const savedUser = localStorage.getItem('orthoiq_web_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('orthoiq_web_user');
      }
    }
  }, []);

  const signInWithEmail = async (email: string) => {
    setIsLoading(true);
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Create user session (simplified for now - in production you'd verify email)
      const webUser: WebUser = {
        id: `email_${Date.now()}`,
        email,
        name: email.split('@')[0],
        authType: 'email'
      };

      setUser(webUser);
      localStorage.setItem('orthoiq_web_user', JSON.stringify(webUser));
    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsGuest = () => {
    const guestUser: WebUser = {
      id: `guest_${Date.now()}`,
      name: 'Guest User',
      authType: 'guest'
    };

    setUser(guestUser);
    localStorage.setItem('orthoiq_web_user', JSON.stringify(guestUser));
  };

  const upgradeToEmail = async (email: string) => {
    if (!user || user.authType !== 'guest') {
      throw new Error('Can only upgrade guest accounts');
    }

    setIsLoading(true);
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Upgrade existing user to email
      const upgradedUser: WebUser = {
        ...user,
        email,
        name: email.split('@')[0],
        authType: 'email'
      };

      setUser(upgradedUser);
      localStorage.setItem('orthoiq_web_user', JSON.stringify(upgradedUser));
    } catch (error) {
      console.error('Email upgrade failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('orthoiq_web_user');
  };

  const value: WebAuthContextType = {
    user,
    isAuthenticated: !!user,
    signInWithEmail,
    signInAsGuest,
    upgradeToEmail,
    signOut,
    isLoading,
  };

  return (
    <WebAuthContext.Provider value={value}>
      {children}
    </WebAuthContext.Provider>
  );
}