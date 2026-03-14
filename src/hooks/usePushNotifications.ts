import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PUSH_SUBSCRIBED_KEY = 'levante_push_subscribed';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermissionState(Notification.permission);
      setIsSubscribed(localStorage.getItem(PUSH_SUBSCRIBED_KEY) === 'true');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported || !user) return false;

    try {
      // Ask for permission
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') return false;

      // Get VAPID public key from edge function
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('subscribe-push', {
        method: 'GET',
      });

      if (vapidError || !vapidData?.publicKey) {
        console.error('Failed to get VAPID key:', vapidError);
        return false;
      }

      // Register push service worker
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      await navigator.serviceWorker.ready;

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey).buffer as ArrayBuffer;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subJson = subscription.toJSON();

      // Send subscription to edge function (bypasses RLS)
      const { error: subError } = await supabase.functions.invoke('subscribe-push', {
        method: 'POST',
        body: {
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
          user_id: user.id,
        },
      });

      if (subError) {
        console.error('Failed to save subscription:', subError);
        return false;
      }

      localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true');
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Push subscription error:', error);
      return false;
    }
  }, [isSupported, user]);

  return {
    isSupported,
    isSubscribed,
    permissionState,
    requestPermission,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
