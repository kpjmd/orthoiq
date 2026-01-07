'use client';

import { useEffect, useState } from 'react';
import { AdminAuthProvider, useAdminAuth, AdminSignInButton } from '@/components/AdminAuthProvider';
import AdminPasswordAuth from '@/components/AdminPasswordAuth';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAdminAuth();
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const passwordAuth = localStorage.getItem('admin_authenticated');
    if (passwordAuth === 'true') {
      setIsPasswordAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  const isAuthorized = isPasswordAuthenticated || (isAuthenticated && user && (
    user.username === 'kpjmd' ||
    user.displayName?.toLowerCase().includes('kpjmd') ||
    user.fid === 15230
  ));

  // Show loading while checking auth
  if (isLoading || checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPasswordAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Admin Access Required</h1>
            <p className="text-gray-600 mb-6">Please authenticate to access the admin dashboard.</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
              Primary Authentication
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Sign in with your Farcaster account
            </p>
            <div className="flex justify-center">
              <AdminSignInButton />
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowPasswordAuth(!showPasswordAuth)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {showPasswordAuth ? 'Hide' : 'Show'} backup password access
            </button>
          </div>

          {showPasswordAuth && (
            <AdminPasswordAuth
              onAuthSuccess={() => {
                setIsPasswordAuthenticated(true);
                setShowPasswordAuth(false);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Unauthorized</h1>
          <p className="text-gray-600 mb-6">Only authorized personnel can access this dashboard.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AdminAuthProvider>
  );
}
