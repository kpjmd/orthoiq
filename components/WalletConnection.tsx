'use client';

import { useState, useEffect } from 'react';
import { WalletConnectionState } from '@/lib/types';

interface WalletConnectionProps {
  onWalletStateChange: (state: WalletConnectionState) => void;
  requiredAmount?: number;
}

export default function WalletConnection({
  onWalletStateChange,
  requiredAmount = 10
}: WalletConnectionProps) {
  const [walletState, setWalletState] = useState<WalletConnectionState>({
    isConnected: false,
    isConnecting: false
  });

  const updateWalletState = (newState: Partial<WalletConnectionState>) => {
    const updatedState = { ...walletState, ...newState };
    setWalletState(updatedState);
    onWalletStateChange(updatedState);
  };

  const connectWallet = async () => {
    updateWalletState({ isConnecting: true, error: undefined });

    try {
      // In a real implementation, this would connect to Farcaster wallet or Base Pay
      // For now, we'll simulate the connection process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate successful wallet connection
      const mockWalletData = {
        isConnected: true,
        isConnecting: false,
        address: `0x${Math.random().toString(16).substring(2, 42)}`,
        balance: Math.floor(Math.random() * 100) + requiredAmount // Ensure sufficient balance
      };

      updateWalletState(mockWalletData);

    } catch (error) {
      console.error('Wallet connection failed:', error);
      updateWalletState({
        isConnecting: false,
        error: 'Failed to connect wallet. Please try again.'
      });
    }
  };

  const disconnectWallet = () => {
    updateWalletState({
      isConnected: false,
      address: undefined,
      balance: undefined,
      error: undefined
    });
  };

  if (walletState.isConnected) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-800 font-semibold">Wallet Connected</span>
            <span className="text-green-600 text-sm">✓</span>
          </div>
          <p className="text-green-700 font-mono text-sm mb-2">
            {walletState.address?.substring(0, 6)}...{walletState.address?.substring(38)}
          </p>
          <p className="text-green-700 text-sm">
            Balance: ${walletState.balance?.toFixed(2)} USDC
          </p>
        </div>
        
        <button
          onClick={disconnectWallet}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Disconnect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {walletState.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{walletState.error}</p>
        </div>
      )}

      <div className="grid gap-3">
        <button
          onClick={connectWallet}
          disabled={walletState.isConnecting}
          className="flex items-center justify-center gap-3 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {walletState.isConnecting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <span className="text-xl">🟣</span>
              <span>Connect Farcaster Wallet</span>
            </>
          )}
        </button>

        <button
          onClick={connectWallet}
          disabled={walletState.isConnecting}
          className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {walletState.isConnecting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <span className="text-xl">🔵</span>
              <span>Connect Base Wallet</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-blue-800 text-sm">
          <span className="font-medium">Required:</span> ${requiredAmount} USDC minimum balance
        </p>
        <p className="text-blue-700 text-xs mt-1">
          Make sure you have enough USDC in your wallet to complete the payment.
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-500 text-xs">
          Don&apos;t have a wallet? 
          <a 
            href="https://www.coinbase.com/wallet" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 ml-1"
          >
            Get Coinbase Wallet
          </a>
        </p>
      </div>
    </div>
  );
}