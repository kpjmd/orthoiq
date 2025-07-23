'use client';

import { useAuth } from './AuthProvider';

export default function SignInButton() {
  const { isAuthenticated, user, signIn, signOut, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
        <span className="opacity-75">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {user.pfpUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={user.pfpUrl} 
              alt="Profile" 
              className="w-6 h-6 rounded-full"
            />
          )}
          <div className="text-sm">
            <div className="font-medium">{user.displayName || user.username}</div>
            <div className="text-xs opacity-75">
              {user.followerCount ? `${user.followerCount} followers` : `FID: ${user.fid}`}
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="px-3 py-1 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signIn}
      className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-sm font-medium"
    >
      <span>🔐</span>
      <span>Sign In with Farcaster</span>
    </button>
  );
}