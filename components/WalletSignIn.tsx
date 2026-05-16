'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useWebAuth } from './WebAuthProvider';

type Purpose = 'connect' | 'verify' | 'backfill';

interface BaseProps {
  onSuccess?: (info: { address: string; backfilledCount?: number }) => void;
  onError?: (message: string) => void;
  className?: string;
}

async function runSiweFlow(opts: {
  address: string;
  purpose: Purpose;
  signMessageAsync: (args: { message: string }) => Promise<string>;
  backfill?: boolean;
}): Promise<{ ok: true; backfilledCount?: number } | { ok: false; error: string }> {
  // Step 1 — request challenge
  const challengeRes = await fetch('/api/web/wallet/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ address: opts.address, purpose: opts.purpose }),
  });
  if (!challengeRes.ok) {
    const data = await challengeRes.json().catch(() => ({}));
    return { ok: false, error: data.error || 'Failed to start wallet sign-in' };
  }
  const { nonce, message } = await challengeRes.json();

  // Step 2 — sign in wallet
  let signature: string;
  try {
    signature = await opts.signMessageAsync({ message });
  } catch (err: any) {
    return { ok: false, error: err?.message?.includes('User rejected') ? 'Signature cancelled' : 'Failed to sign message' };
  }

  // Step 3 — submit signature to the right endpoint
  const endpoint =
    opts.purpose === 'connect' ? '/api/web/wallet/connect' : '/api/web/wallet/verify';
  const body =
    opts.purpose === 'connect'
      ? { nonce, signature }
      : { nonce, signature, backfill: opts.backfill ?? opts.purpose === 'backfill' };

  const submitRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const data = await submitRes.json().catch(() => ({}));
    return { ok: false, error: data.error || 'Wallet sign-in failed' };
  }

  const data = await submitRes.json();
  return { ok: true, backfilledCount: data.backfilledCount };
}

/**
 * Connect wallet + sign-in for an unauthenticated visitor.
 * Creates a new wallet-only web_users row + session on success.
 */
export function WalletSignInButton({ onSuccess, onError, className }: BaseProps) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, status: connectStatus } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const { refreshUser } = useWebAuth();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      let activeAddress = address;
      if (!isConnected || !activeAddress) {
        const connector = connectors[0];
        if (!connector) {
          onError?.('No wallet connector available');
          return;
        }
        const res = await connectAsync({ connector });
        activeAddress = res.accounts?.[0];
      }
      if (!activeAddress) {
        onError?.('Failed to obtain wallet address');
        return;
      }

      const flow = await runSiweFlow({
        address: activeAddress,
        purpose: 'connect',
        signMessageAsync: ({ message }) => signMessageAsync({ message }),
      });

      if (!flow.ok) {
        onError?.(flow.error);
        return;
      }

      await refreshUser();
      onSuccess?.({ address: activeAddress });
    } catch (err: any) {
      onError?.(err?.message || 'Wallet sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const isLoading = busy || connectStatus === 'pending';

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={
        className ||
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors'
      }
    >
      {isLoading ? 'Signing in…' : 'Sign in with wallet'}
    </button>
  );
}

interface VerifyProps extends BaseProps {
  backfill?: boolean;
  label?: string;
}

/**
 * Verify wallet ownership for an already-authenticated user.
 * Optionally also backfills prior wallet-only consultations onto their profile.
 */
export function WalletVerifyButton({
  onSuccess,
  onError,
  className,
  backfill = true,
  label = 'Verify wallet ownership',
}: VerifyProps) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { refreshUser } = useWebAuth();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      let activeAddress = address;
      if (!isConnected || !activeAddress) {
        const connector = connectors[0];
        if (!connector) {
          onError?.('No wallet connector available');
          return;
        }
        const res = await connectAsync({ connector });
        activeAddress = res.accounts?.[0];
      }
      if (!activeAddress) {
        onError?.('Failed to obtain wallet address');
        return;
      }

      const flow = await runSiweFlow({
        address: activeAddress,
        purpose: backfill ? 'backfill' : 'verify',
        signMessageAsync: ({ message }) => signMessageAsync({ message }),
        backfill,
      });

      if (!flow.ok) {
        // If the wallet conflicts, disconnect so the user can try a different one.
        if (flow.error.toLowerCase().includes('another account')) {
          disconnect();
        }
        onError?.(flow.error);
        return;
      }

      await refreshUser();
      onSuccess?.({ address: activeAddress, backfilledCount: flow.backfilledCount });
    } catch (err: any) {
      onError?.(err?.message || 'Wallet verification failed');
    } finally {
      setBusy(false);
    }
  };

  const isLoading = busy || connectStatus === 'pending';

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={
        className ||
        'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 disabled:opacity-60 text-blue-700 text-xs font-medium transition-colors'
      }
    >
      {isLoading ? 'Verifying…' : label}
    </button>
  );
}
