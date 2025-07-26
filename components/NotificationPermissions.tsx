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
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'requesting'>('unknown');
  const [isVisible, setIsVisible] = useState(false);

  const userFid = fid || user?.fid?.toString();

  useEffect(() => {
    // Only show notification prompt for authenticated users
    if (userFid && user) {
      // Check if we've already asked for permissions
      const hasAsked = localStorage.getItem(`notification_permission_asked_${userFid}`);
      const hasGranted = localStorage.getItem(`notification_permission_granted_${userFid}`);
      
      if (hasGranted === 'true') {
        setPermissionState('granted');
      } else if (hasAsked !== 'true') {
        setIsVisible(true);
      }
    }
  }, [userFid, user]);

  const requestPermissions = async () => {
    if (!userFid) return;

    setPermissionState('requesting');
    
    try {
      // Use Farcaster SDK to prompt user to add miniapp
      // This will trigger webhook events when notifications are enabled
      await sdk.actions.addMiniApp();
      
      // Check if permissions were granted
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'request_permissions',
          data: { fid: userFid }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setPermissionState('granted');
        localStorage.setItem(`notification_permission_granted_${userFid}`, 'true');
        onPermissionGranted?.();
      } else {
        setPermissionState('denied');
      }
      
      localStorage.setItem(`notification_permission_asked_${userFid}`, 'true');
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      setPermissionState('denied');
      setIsVisible(false);
    }
  };

  const dismissPrompt = () => {
    setIsVisible(false);
    localStorage.setItem(`notification_permission_asked_${userFid}`, 'true');
  };

  if (!isVisible || !userFid) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">🔔</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Stay Updated on Your Questions
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            Get notified when Dr. KPJMD reviews and approves your orthopedic questions. 
            We&apos;ll also let you know when your daily question limit resets.
          </p>
          <div className="mt-3 flex space-x-3">
            <button
              onClick={requestPermissions}
              disabled={permissionState === 'requesting'}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {permissionState === 'requesting' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enabling...
                </>
              ) : (
                'Enable Notifications'
              )}
            </button>
            <button
              onClick={dismissPrompt}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Maybe Later
            </button>
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          <button
            onClick={dismissPrompt}
            className="bg-blue-50 rounded-md inline-flex text-blue-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}