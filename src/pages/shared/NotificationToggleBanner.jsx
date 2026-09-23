import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requestBrowserPushToken, isBrowserPushSupported } from '../../services/notification/browserPushService';
import { registerPushToken } from '../../services/notification/notificationPreferenceService';

const NotificationToggleBanner = () => {
  const { user, isAuthenticated } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');

  const BANNER_DISMISSED_KEY = (userId) => `notification_banner_dismissed_${userId}`;
  const ACCOUNT_CREATED_KEY = (userId) => `account_created_time_${userId}`;

  // Check if this is first login by checking session storage
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const dismissedKey = BANNER_DISMISSED_KEY(user.id);
    const createdKey = ACCOUNT_CREATED_KEY(user.id);

    // Check if banner was already dismissed
    const wasDismissed = localStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setShowBanner(false);
      return;
    }

    // Check if account was just created (within last 5 minutes)
    const createdTime = localStorage.getItem(createdKey);
    const now = Date.now();

    if (createdTime) {
      const timeDiff = now - parseInt(createdTime);
      // Show banner if account was created within last 30 minutes
      if (timeDiff < 30 * 60 * 1000) {
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    } else {
      // First time seeing this user - assume new login
      localStorage.setItem(createdKey, now.toString());
      setShowBanner(true);
    }
  }, [user?.id, isAuthenticated]);

  const handleEnableNotifications = async () => {
    if (!isBrowserPushSupported()) {
    //   alert('Your browser does not support push notifications.');
      dismissBanner();
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestBrowserPushToken();

      if (result.ok && result.token) {
        // Store the token in the backend
        try {
          await registerPushToken({
            token: result.token,
            browser_name: result.browserName,
            device_label: result.deviceLabel,
          });
          setPermissionStatus(result.permission);
        //   alert('✅ Push notifications enabled successfully!');
          dismissBanner();
        } catch (error) {
          console.error('Failed to register push token:', error);
        //   alert('❌ Failed to save notification settings. Please try again.');
        }
      } else {
        setPermissionStatus(result.permission);
        dismissBanner();
      }
    } catch (error) {
      console.error('Error requesting push token:', error);
    //   alert('❌ An error occurred while setting up notifications.');
      dismissBanner();
    } finally {
      setIsLoading(false);
    }
  };

  const dismissBanner = () => {
    if (user?.id) {
      localStorage.setItem(BANNER_DISMISSED_KEY(user.id), 'true');
    }
    setShowBanner(false);
  };

  if (!showBanner || !isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 pt-1">
              <svg
                className="h-5 w-5 text-blue-600 dark:text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.353-1.008l5.353 1.007a1 1 0 001.169-1.409l-7-14z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Enable Push Notifications
              </h3>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                Stay updated with real-time notifications about tournaments, matches, and announcements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enabling...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Enable Notifications
                </>
              )}
            </button>

            <button
              onClick={dismissBanner}
              className="inline-flex text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none transition-colors duration-200"
              aria-label="Dismiss notification banner"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToggleBanner;
