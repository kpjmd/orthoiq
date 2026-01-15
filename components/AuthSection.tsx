'use client';

import { useWebAuth } from './WebAuthProvider';
import WebOrthoInterface from './WebOrthoInterface';
import WebSignIn from './WebSignIn';

export default function AuthSection() {
  const { isAuthenticated, user, magicLinkSent } = useWebAuth();

  // Show sign-in screen if:
  // 1. Not authenticated at all, OR
  // 2. User entered email but hasn't verified yet (pending state)
  const isPendingEmailVerification = user?.authType === 'email' && !user?.emailVerified;
  const shouldShowSignIn = !isAuthenticated || (isPendingEmailVerification && magicLinkSent);

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
        {shouldShowSignIn ? 'Get Started' : 'Ask OrthoIQ'}
      </h2>
      {shouldShowSignIn ? (
        <WebSignIn />
      ) : (
        <WebOrthoInterface className="max-w-2xl mx-auto" />
      )}
    </>
  );
}
