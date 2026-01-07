'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  AuthKitProvider, 
  useProfile,
  SignInButton as AuthKitSignInButton
} from '@farcaster/auth-kit';

interface AdminUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  isVerified?: boolean;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => void;
  error: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

function AdminAuthContent({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, profile } = useProfile();

  // Start with null - same on server and client to avoid hydration mismatch
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true to show loading
  const [hasMounted, setHasMounted] = useState(false);

  // Hydrate from localStorage after mount (client-side only)
  useEffect(() => {
    setHasMounted(true);
    const savedUser = localStorage.getItem('admin_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error('Failed to parse saved admin user:', err);
        localStorage.removeItem('admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Sync Farcaster auth state (only after mount)
  useEffect(() => {
    if (!hasMounted) return;

    if (isAuthenticated && profile && profile.fid) {
      const adminUser: AdminUser = {
        fid: profile.fid,
        username: profile.username,
        displayName: profile.displayName,
        pfpUrl: profile.pfpUrl,
        isVerified: true // Auth Kit provides verified users
      };

      setUser(adminUser);
      setError(null);

      // Store in localStorage for persistence
      localStorage.setItem('admin_user', JSON.stringify(adminUser));

      console.log('Admin Auth: Farcaster authentication successful for FID:', profile.fid);
    }
    // Don't clear user on !isAuthenticated - localStorage is source of truth for persistence
  }, [isAuthenticated, profile, hasMounted]);

  const handleSignOut = () => {
    // Clear local state
    setUser(null);
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_authenticated'); // Also clear password auth
    
    // Reload page to clear Auth Kit state
    window.location.reload();
  };

  const value: AdminAuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading: !hasMounted || isLoading, // Loading until mounted and localStorage checked
    signOut: handleSignOut,
    error,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const config = {
    rpcUrl: 'https://mainnet.optimism.io',
    domain: 'orthoiq.vercel.app',
    siweUri: 'https://orthoiq.vercel.app/admin',
  };

  return (
    <AuthKitProvider config={config}>
      <AdminAuthContent>{children}</AdminAuthContent>
    </AuthKitProvider>
  );
}

// Admin-specific sign in button
export function AdminSignInButton() {
  const { error } = useAdminAuth();
  
  return (
    <div>
      <AuthKitSignInButton />
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}