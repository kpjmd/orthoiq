'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthKitProvider, useSignIn } from '@farcaster/auth-kit';

interface User {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  verifications?: string[];
  followerCount?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = () => {
    // Temporarily disabled - would integrate with @farcaster/auth-kit
    console.log('Sign in clicked - auth integration needed');
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('orthoiq_user');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    signIn,
    signOut,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const config = {
    rpcUrl: 'https://mainnet.optimism.io',
    domain: 'orthoiq.vercel.app',
    siweUri: 'https://orthoiq.vercel.app/mini',
  };

  return (
    <AuthKitProvider config={config}>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </AuthKitProvider>
  );
}