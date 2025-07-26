'use client';

import { useState } from 'react';

interface AdminPasswordAuthProps {
  onAuthSuccess: () => void;
}

export default function AdminPasswordAuth({ onAuthSuccess }: AdminPasswordAuthProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/password-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        // Store admin session
        localStorage.setItem('admin_authenticated', 'true');
        onAuthSuccess();
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          🔐 Admin Password Access
        </h3>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Temporary backup access for admin dashboard
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter admin password"
              required
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-600 text-center">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isLoading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          This is a temporary backup method. Primary authentication is via Farcaster.
        </div>
      </div>
    </div>
  );
}