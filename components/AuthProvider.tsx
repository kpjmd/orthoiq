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
    console.log('Auth: Starting sign-in process...');
    
    try {
      // Get Quick Auth token
      console.log('Auth: Requesting Quick Auth token...');
      const authResult = await sdk.quickAuth.getToken();
      
      if (authResult.token) {
        console.log('Auth: Token received, setting in state');
        setToken(authResult.token);
        
        // Fetch user data from our backend using the token
        console.log('Auth: Fetching user data from /api/auth/me');
        const res = await sdk.quickAuth.fetch('/api/auth/me', {
          method: 'GET'
        });
        
        console.log('Auth: API response status:', res.status);
        
        if (res.ok) {
          const userData = await res.json();
          console.log('Auth: User data received:', userData);
          
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
          console.log('Auth: Sign-in successful for user:', user.username || `FID ${user.fid}`);
        } else {
          console.warn('Auth: API call failed, attempting fallback...');
          const errorData = await res.text();
          console.error('Auth API error:', errorData);
          
          // Enhanced fallback: try to extract FID from token
          try {
            const [, payloadBase64] = authResult.token.split('.');
            const payload = JSON.parse(atob(payloadBase64));
            const fid = parseInt(String(payload.sub));
            
            if (fid && !isNaN(fid)) {
              console.log('Auth: Using fallback FID extraction:', fid);
              
              const basicUser: User = {
                fid,
                username: fid === 15230 ? 'kpjmd' : `user_${fid}`,
                displayName: fid === 15230 ? 'Dr. KPJMD' : `User ${fid}`,
                pfpUrl: undefined,
                verifications: fid === 15230 ? ['medical'] : [],
                followerCount: undefined
              };
              
              setUser(basicUser);
              localStorage.setItem('orthoiq_user', JSON.stringify(basicUser));
              console.log('Auth: Fallback sign-in successful for FID:', fid);
            } else {
              throw new Error('Could not extract valid FID from token');
            }
          } catch (fallbackError) {
            console.error('Auth: Fallback failed:', fallbackError);
            throw new Error('Authentication failed and fallback unsuccessful');
          }
        }
      } else {
        console.error('Auth: No token received from Quick Auth');
        throw new Error('No authentication token received');
      }
    } catch (error) {
      console.error('Auth: Sign-in failed:', error);
      setToken(null);
      setUser(null);
      
      // Show user-friendly error
      if (error instanceof Error) {
        alert(`Authentication failed: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
      }
    } finally {
      setIsLoading(false);
      console.log('Auth: Sign-in process completed');
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