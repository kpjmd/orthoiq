'use client';

import { useState } from 'react';
import { useWebAuth } from './WebAuthProvider';
import OrthoIQLogo from './OrthoIQLogo';

export default function WebSignIn() {
  const { signInWithEmail, signInAsGuest, isLoading, magicLinkSent, user } = useWebAuth();
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(false);

  // Use email from user context if available (handles page refresh case)
  const displayEmail = sentEmail || user?.email || '';

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      const result = await signInWithEmail(email);
      if (result.success) {
        setSentEmail(email);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  const handleResend = async () => {
    if (resendCooldown || !displayEmail) return;
    try {
      setError('');
      setResendCooldown(true);
      const result = await signInWithEmail(displayEmail);
      if (!result.success) {
        setError(result.message);
      }
      // Keep cooldown for 30 seconds
      setTimeout(() => setResendCooldown(false), 30000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
      setResendCooldown(false);
    }
  };

  const handleUseDifferentEmail = () => {
    setSentEmail('');
    setEmail('');
    setError('');
  };

  const handleGuestSignIn = () => {
    setError('');
    signInAsGuest();
  };

  // Show "Check your email" screen after magic link is sent
  if (magicLinkSent && displayEmail) {
    return (
      <div className="bg-white rounded-lg shadow-lg border p-8 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Check your email</h2>
          <p className="text-gray-600">
            We sent a magic link to
          </p>
          <p className="text-blue-600 font-medium mt-1">{displayEmail}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 text-center">
            Click the link in your email to sign in. The link expires in 15 minutes.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={isLoading || resendCooldown}
            className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'Sending...' : resendCooldown ? 'Email sent! Check your inbox' : "Didn't receive it? Resend"}
          </button>

          <button
            onClick={handleUseDifferentEmail}
            className="w-full text-blue-600 hover:text-blue-700 font-medium py-2 px-4 transition-colors"
          >
            Use a different email
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleGuestSignIn}
            className="w-full text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
          >
            Or continue as guest
          </button>
        </div>
      </div>
    );
  }

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
            Get 10 questions/day with verified email
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors mb-3"
        >
          {isLoading ? 'Sending link...' : 'Continue with Email'}
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
        Continue as Guest (1 question/day)
      </button>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Features */}
      <div className="text-center text-sm text-gray-600">
        <p className="mb-2"><strong>Features:</strong></p>
        <ul className="space-y-1">
          <li>AI-powered orthopedic consultations</li>
          <li>Professional medical visuals</li>
          <li>MD-reviewed responses</li>
          <li>Shareable health insights</li>
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