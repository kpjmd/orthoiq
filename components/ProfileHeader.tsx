'use client';

import Link from 'next/link';
import { useWebAuth } from './WebAuthProvider';

function initialsFor(user: { email?: string; walletAddress?: string }): string {
  if (user.email) {
    const local = user.email.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (local.slice(0, 2) || '?').toUpperCase();
  }
  if (user.walletAddress) return user.walletAddress.slice(2, 4).toUpperCase();
  return '?';
}

/**
 * Small avatar link to /profile. Renders nothing when no session.
 */
export default function ProfileHeader() {
  const { user, isAuthenticated } = useWebAuth();

  if (!isAuthenticated || !user) return null;

  return (
    <Link
      href="/profile"
      title={user.email || user.walletAddress || 'Your profile'}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm font-bold hover:opacity-90 transition-opacity"
    >
      {initialsFor(user)}
    </Link>
  );
}
