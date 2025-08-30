'use client';

import { useState } from 'react';
import { useWebAuth } from './WebAuthProvider';
import OrthoIQLogo from './OrthoIQLogo';

export default function WebSignIn() {
  const { signInWithEmail, signInAsGuest, isLoading } = useWebAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await signInWithEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  const handleGuestSignIn = () => {
    setError('');
    signInAsGuest();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border p-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <OrthoIQLogo size="small" variant="blue" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to OrthoIQ</h2>
        <p className="text-gray-600">Get started with your orthopedic AI assistant</p>
      </div>

      {/* Email Sign In */}
      <form onSubmit={handleEmailSignIn} className="mb-4">
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address (Optional)
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            We&apos;ll remember your preferences and question history
          </p>
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors mb-3"
        >
          {isLoading ? 'Signing in...' : 'Continue with Email'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>

      {/* Guest Sign In */}
      <button
        onClick={handleGuestSignIn}
        disabled={isLoading}
        className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors mb-4"
      >
        Continue as Guest
      </button>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Features */}
      <div className="text-center text-sm text-gray-600">
        <p className="mb-2">✨ <strong>Features:</strong></p>
        <ul className="space-y-1">
          <li>• 3 questions per day</li>
          <li>• Professional medical visuals</li>
          <li>• MD-reviewed responses</li>
          <li>• Shareable health insights</li>
        </ul>
      </div>

      {/* Upgrade CTA */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
        <p className="text-blue-800 text-sm">
          <strong>Want unlimited access?</strong>
        </p>
        <p className="text-blue-700 text-xs mt-1">
          Get the full OrthoIQ experience on Farcaster or Base
        </p>
      </div>
    </div>
  );
}