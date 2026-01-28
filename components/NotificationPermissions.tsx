'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAuth } from './AuthProvider';

interface NotificationPermissionsProps {
  fid?: string;
  onPermissionGranted?: () => void;
}

export default function NotificationPermissions({ fid, onPermissionGranted }: NotificationPermissionsProps) {
  const { user } = useAuth();
  // Opt-out model: enabled by default
  const [isEnabled, setIsEnabled] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const userFid = fid || user?.fid?.toString();

  useEffect(() => {
    // Opt-out model: check if user has explicitly opted out via localStorage
    if (!userFid) {
      setIsChecking(false);
      return;
    }

    // Check if user has explicitly opted out
    const hasOptedOut = localStorage.getItem(`notification_opted_out_${userFid}`) === 'true';
    setIsEnabled(!hasOptedOut);
    setIsChecking(false);
  }, [userFid]);

  const enableNotifications = () => {
    if (!userFid || isProcessing) return;

    setIsProcessing(true);

    try {
      // Remove opt-out flag from localStorage
      localStorage.removeItem(`notification_opted_out_${userFid}`);
      setIsEnabled(true);
      onPermissionGranted?.();

      // Optionally trigger SDK to register for notifications
      try {
        sdk.actions.addMiniApp();
      } catch (e) {
        console.log('SDK addMiniApp called');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const disableNotifications = () => {
    if (!userFid || isProcessing) return;

    setIsProcessing(true);

    try {
      // Set opt-out flag in localStorage
      localStorage.setItem(`notification_opted_out_${userFid}`, 'true');
      setIsEnabled(false);
    } catch (error) {
      console.error('Failed to disable notifications:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!userFid || isChecking) {
    return null;
  }

  return (
    <div className="bg-white border rounded-lg px-4 py-2 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={isEnabled ? "text-green-600" : "text-yellow-600"}>
          {isEnabled ? "🔔" : "🔕"}
        </span>
        <span className="text-sm text-gray-700">
          {isEnabled
            ? "Milestone notifications enabled"
            : "Enable milestone notifications"}
        </span>
      </div>
      <button
        onClick={isEnabled ? disableNotifications : enableNotifications}
        disabled={isProcessing}
        className={`text-sm font-medium transition-colors disabled:opacity-50 ${
          isEnabled
            ? "text-gray-600 hover:text-gray-800"
            : "text-blue-600 hover:text-blue-800"
        }`}
      >
        {isProcessing ? (
          <span className="flex items-center gap-1">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        ) : isEnabled ? (
          "Disable"
        ) : (
          "Enable"
        )}
      </button>
    </div>
  );
}
