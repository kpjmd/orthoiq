'use client';

import { useEffect, useState } from 'react';
import AdminPasswordAuth from '@/components/AdminPasswordAuth';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/whoami', { credentials: 'include' });
      setIsAuthorized(res.ok);
    } catch {
      setIsAuthorized(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Admin Access Required</h1>
            <p className="text-gray-600 mb-6">Enter the admin password to access the dashboard.</p>
          </div>
          <AdminPasswordAuth
            onAuthSuccess={() => checkAuth()}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
