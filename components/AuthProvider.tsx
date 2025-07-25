'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

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
  signIn: () => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Check for existing user session on load
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Check if we have a token in the SDK
        if (sdk.quickAuth.token) {
          setToken(sdk.quickAuth.token);
          // Try to get user info from saved session
          const savedUser = localStorage.getItem('orthoiq_user');
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser.fid && typeof parsedUser.fid === 'number') {
              setUser(parsedUser);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      }
    };

    loadSession();
  }, []);

  const signIn = async () => {
    setIsLoading(true);
    try {
      // Get Quick Auth token
      const authResult = await sdk.quickAuth.getToken();
      
      if (authResult.token) {
        setToken(authResult.token);
        
        // Fetch user data from our backend using the token
        const res = await sdk.quickAuth.fetch('/api/auth/me', {
          method: 'GET'
        });
        
        if (res.ok) {
          const userData = await res.json();
          const user: User = {
            fid: userData.fid,
            username: userData.username,
            displayName: userData.displayName,
            pfpUrl: userData.pfpUrl,
            verifications: userData.verifications || [],
            followerCount: userData.followerCount
          };
          
          setUser(user);
          localStorage.setItem('orthoiq_user', JSON.stringify(user));
          console.log('Quick Auth sign-in successful:', user.username || user.fid);
        } else {
          // Fallback: create basic user from token
          // In production, the token would contain the FID as the 'sub' claim
          const basicUser: User = {
            fid: parseInt(authResult.token.split('.')[1]) || 0, // This is a placeholder
            username: undefined,
            displayName: undefined,
            pfpUrl: undefined,
            verifications: [],
            followerCount: undefined
          };
          
          setUser(basicUser);
          localStorage.setItem('orthoiq_user', JSON.stringify(basicUser));
        }
      }
    } catch (error) {
      console.error('Quick Auth sign-in failed:', error);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('orthoiq_user');
    // Clear any Quick Auth session
    // Note: SDK doesn't provide a clear method, so we reload to reset
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!token,
    signIn,
    signOut,
    isLoading,
    token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}