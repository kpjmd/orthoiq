'use client';

import { useWebAuth } from './WebAuthProvider';
import WebOrthoInterface from './WebOrthoInterface';
import WebSignIn from './WebSignIn';

export default function AuthSection() {
  const { isAuthenticated } = useWebAuth();

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">
        {isAuthenticated ? 'Ask OrthoIQ' : 'Get Started'}
      </h2>
      {isAuthenticated ? (
        <WebOrthoInterface className="max-w-2xl mx-auto" />
      ) : (
        <WebSignIn />
      )}
    </>
  );
}
