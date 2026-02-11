'use client';

import { useState, useEffect, useRef } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAuth } from './AuthProvider';

interface NotificationPermissionsProps {
  fid?: string;
  isAppAdded?: boolean;
  onPermissionGranted?: () => void;
}

export default function NotificationPermissions({
  fid,
  isAppAdded = false,
  onPermissionGranted
}: NotificationPermissionsProps) {
  const { user } = useAuth();
  // Opt-in model: disabled by default
  const [isEnabled, setIsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  // Use the SDK prop directly — DB doesn't reliably track app-added state
  const [isAppInstalled, setIsAppInstalled] = useState(isAppAdded);

  // Grace period: skip background sync for 60s after user toggles
  const lastToggleTime = useRef<number>(0);

  const userFid = fid || user?.fid?.toString();

  /**
   * Save notification token directly to DB (primary path).
   * Returns true on success.
   */
  const saveTokenDirectly = async (
    fid: string,
    token: string,
    url: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, token, url }),
      });
      if (response.ok) {
        console.log('Token saved directly via client');
        return true;
      }
      console.error('Direct token save failed:', response.status);
      return false;
    } catch (e) {
      console.error('Direct token save error:', e);
      return false;
    }
  };

  /**
   * Poll notification status until webhook completes (fallback path).
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
      delay = Math.min(delay * 2, 5000);
    }

    console.warn('Notification verification timed out after all attempts');
    return false;
  };

  // Initial status check — use SDK prop for isAppInstalled, only query DB for isEnabled
  useEffect(() => {
    if (!userFid) {
      setIsChecking(false);
      return;
    }

    // Trust the SDK prop for app-installed state
    setIsAppInstalled(isAppAdded);

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/notifications/status?fid=${userFid}`);
        if (response.ok) {
          const data = await response.json();
          setIsEnabled(data.enabled);
        }
      } catch (error) {
        console.error('Failed to check notification status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [userFid, isAppAdded]);

  // Background sync to detect and correct state mismatches
  useEffect(() => {
    if (!userFid || !isEnabled) return;

    const syncInterval = setInterval(async () => {
      // Grace period: skip sync for 60s after a user toggle
      if (Date.now() - lastToggleTime.current < 60000) {
        return;
      }

      try {
        const response = await fetch(`/api/notifications/status?fid=${userFid}`);
        if (response.ok) {
          const data = await response.json();
          if (data.enabled !== isEnabled) {
            console.log(`Background sync: correcting state ${isEnabled} -> ${data.enabled}`);
            setIsEnabled(data.enabled);
          }
        }
        // Non-ok responses (500) are ignored — prevents false corrections on DB errors
      } catch (e) {
        // Silent failure for background sync
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [userFid, isEnabled]);

  const handleAddApp = async () => {
    if (!userFid || isProcessing) return;

    setIsProcessing(true);
    lastToggleTime.current = Date.now();

    try {
      const result = await sdk.actions.addMiniApp();

      // App was successfully added
      setIsAppInstalled(true);

      if (result.notificationDetails) {
        console.log('App added WITH notifications - saving token directly');

        // Primary path: save token directly from client
        const saved = await saveTokenDirectly(
          userFid,
          result.notificationDetails.token,
          result.notificationDetails.url
        );

        if (saved) {
          setIsEnabled(true);
        } else {
          // Fallback: poll for webhook
          console.warn('Direct save failed, falling back to webhook polling');
          const verified = await pollNotificationStatus(userFid);
          setIsEnabled(verified);
        }
      } else {
        console.log('App added - user can now opt-in to notifications separately');
      }

      onPermissionGranted?.();
    } catch (error) {
      console.error('Failed to add app:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const enableNotifications = async () => {
    if (!userFid || isProcessing) return;

    setIsProcessing(true);
    lastToggleTime.current = Date.now();

    try {
      const result = await sdk.actions.addMiniApp();

      if (result.notificationDetails) {
        console.log('Notifications enabled via addMiniApp - saving token directly');

        // Primary path: save token directly from client
        const saved = await saveTokenDirectly(
          userFid,
          result.notificationDetails.token,
          result.notificationDetails.url
        );

        if (saved) {
          setIsEnabled(true);
          onPermissionGranted?.();
        } else {
          // Fallback: poll for webhook
          console.warn('Direct save failed, falling back to webhook polling');
          const verified = await pollNotificationStatus(userFid);
          setIsEnabled(verified);
          if (verified) {
            onPermissionGranted?.();
          }
        }
      } else {
        console.log('App added but notifications not enabled - user can enable via Farcaster settings');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const disableNotifications = async () => {
    if (!userFid || isProcessing) return;

    setIsProcessing(true);
    lastToggleTime.current = Date.now();

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

  // Early return if app not added - show installation prompt
  if (!isAppInstalled) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📱</span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Enable Milestone Notifications
            </h3>
            <p className="text-xs text-blue-700 mb-3">
              Get notified at 2, 4, and 8 weeks to track your orthopedic progress
            </p>
            <button
              onClick={handleAddApp}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </span>
              ) : (
                "Add to Farcaster"
              )}
            </button>
          </div>
        </div>
      </div>
    );
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
