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

  /**
   * Poll notification status until webhook completes
   * Attempts: 500ms, 1s, 2s, 4s, 5s, 5s, 5s, 5s (max ~27s)
   */
  const pollNotificationStatus = async (
    fid: string,
    maxAttempts: number = 8,
    initialDelay: number = 500
  ): Promise<boolean> => {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        const response = await fetch(`/api/notifications/status?fid=${fid}`);
        if (response.ok) {
          const data = await response.json();
          if (data.enabled) {
            console.log(`Notification verified on attempt ${attempt + 1}`);
            return true;
          }
        }
      } catch (e) {
        console.error(`Verification attempt ${attempt + 1} failed:`, e);
      }

      attempt++;
      delay = Math.min(delay * 2, 5000); // Exponential backoff, max 5s
    }

    console.warn('Notification verification timed out after all attempts');
    return false; // Timed out
  };

  useEffect(() => {
    if (!userFid) {
      setIsChecking(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/notifications/status?fid=${userFid}`);
        if (response.ok) {
          const data = await response.json();
          setIsEnabled(data.enabled);
        } else {
          // Default to enabled on error (opt-out model)
          setIsEnabled(true);
        }
      } catch (error) {
        console.error('Failed to check notification status:', error);
        setIsEnabled(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [userFid]);

  // Background sync to detect and correct state mismatches
  useEffect(() => {
    if (!userFid || !isEnabled) return;

    // Periodically verify status when enabled
    const syncInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/notifications/status?fid=${userFid}`);
        if (response.ok) {
          const data = await response.json();
          if (data.enabled !== isEnabled) {
            console.log(`Background sync: correcting state ${isEnabled} -> ${data.enabled}`);
            setIsEnabled(data.enabled);
          }
        }
      } catch (e) {
        // Silent failure for background sync
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(syncInterval);
  }, [userFid, isEnabled]);

  const enableNotifications = async () => {
    if (!userFid || isProcessing) return;

    setIsProcessing(true);

    try {
      // Call SDK and AWAIT the result
      await sdk.actions.addMiniApp();

      // Optimistically update UI
      setIsEnabled(true);
      onPermissionGranted?.();

      // Poll for verification with intelligent backoff
      const verified = await pollNotificationStatus(userFid);

      if (!verified) {
        // Webhook didn't complete within timeout
        // Keep optimistic state but log warning
        console.warn('Notification verification timed out - webhook may still be processing');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      // SDK call failed - revert optimistic update
      setIsEnabled(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const disableNotifications = async () => {
    if (!userFid || isProcessing) return;

    setIsProcessing(true);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'disable_permissions',
          data: { fid: userFid }
        })
      });

      if (response.ok) {
        setIsEnabled(false);
      } else {
        console.error('Failed to disable notifications');
      }
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
