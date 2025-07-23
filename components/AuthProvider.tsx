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
  const { signIn: farcasterSignIn, isSuccess, isError, data, isPolling: farcasterLoading } = useSignIn({});

  // Check for existing user session on load
  useEffect(() => {
    // Only check for admin bypass in development or when explicitly enabled
    const adminBypass = process.env.NODE_ENV === 'development' && 
                       (process.env.NEXT_PUBLIC_ADMIN_BYPASS === 'true' || 
                        localStorage.getItem('orthoiq_admin_bypass') === 'true');
    
    if (adminBypass) {
      setUser({
        fid: 15230,
        username: 'kpjmd',
        displayName: 'Dr. KPJMD',
        pfpUrl: undefined,
        verifications: [],
        followerCount: undefined
      });
    } else {
      // Check for existing user session
      const savedUser = localStorage.getItem('orthoiq_user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          // Validate the user data before setting
          if (parsedUser.fid && typeof parsedUser.fid === 'number') {
            setUser(parsedUser);
          } else {
            localStorage.removeItem('orthoiq_user');
          }
        } catch (e) {
          console.error('Failed to parse saved user:', e);
          localStorage.removeItem('orthoiq_user');
        }
      }
    }
  }, []);

  // Handle Farcaster sign-in success
  useEffect(() => {
    if (isSuccess && data && data.fid) {
      const userData: User = {
        fid: data.fid,
        username: data.username,
        displayName: data.displayName,
        pfpUrl: data.pfpUrl,
        verifications: data.verifications || [],
        followerCount: undefined
      };
      
      setUser(userData);
      localStorage.setItem('orthoiq_user', JSON.stringify(userData));
      console.log('Farcaster sign-in successful:', userData.username);
    }
  }, [isSuccess, data]);

  // Handle Farcaster sign-in error
  useEffect(() => {
    if (isError) {
      console.error('Farcaster sign-in failed');
      setIsLoading(false);
    }
  }, [isError]);

  // Update loading state
  useEffect(() => {
    setIsLoading(farcasterLoading);
  }, [farcasterLoading]);

  const signIn = () => {
    // Check for admin bypass in development only
    const adminBypass = process.env.NODE_ENV === 'development' && 
                       process.env.NEXT_PUBLIC_ADMIN_BYPASS === 'true';
    
    if (adminBypass) {
      const adminUser = {
        fid: 15230,
        username: 'kpjmd',
        displayName: 'Dr. KPJMD',
        pfpUrl: undefined,
        verifications: [],
        followerCount: undefined
      };
      setUser(adminUser);
      localStorage.setItem('orthoiq_user', JSON.stringify(adminUser));
      localStorage.setItem('orthoiq_admin_bypass', 'true');
      console.log('Admin bypass enabled - signed in as Dr. KPJMD');
    } else {
      // Use proper Farcaster sign-in
      farcasterSignIn();
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('orthoiq_user');
    localStorage.removeItem('orthoiq_admin_bypass');
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