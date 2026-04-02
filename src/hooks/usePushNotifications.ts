import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PUSH_SUBSCRIBED_KEY = 'vallo_push_subscribed';

async function syncSubscriptionWithBackend(subscription: PushSubscription, userId: string) {
  const subJson = subscription.toJSON();

  const { error } = await supabase.functions.invoke('subscribe-push', {
    method: 'POST',
    body: {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
      user_id: userId,
    },
  });

  if (error) throw error;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  const checkExistingSubscription = useCallback(async () => {
    if (!user || !('serviceWorker' in navigator)) return;

    try {
      await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const subscribed = Boolean(subscription) && Notification.permission === 'granted';

      setIsSubscribed(subscribed);

      if (subscription && subscribed) {
        localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true');
        await syncSubscriptionWithBackend(subscription, user.id);
      } else {
        localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
      }
    } catch (error) {
      console.error('Failed to inspect push subscription:', error);
    }
  }, [user]);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermissionState(Notification.permission);
      setIsSubscribed(localStorage.getItem(PUSH_SUBSCRIBED_KEY) === 'true');
    }

    if (supported && user) {
      void checkExistingSubscription();
    }
  }, [checkExistingSubscription, user]);

  const requestPermission = useCallback(async () => {
    if (!isSupported || !user) return false;

    try {
      // Ask for permission
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

      setPermissionState(permission);

      if (permission !== 'granted') {
        localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
        setIsSubscribed(false);
        return false;
      }

      // Get VAPID public key from edge function
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('subscribe-push', {
        method: 'GET',
      });

      if (vapidError || !vapidData?.publicKey) {
        console.error('Failed to get VAPID key:', vapidError);
        return false;
      }

      // Register push service worker
      await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);

        // Uint8Array is more reliable than ArrayBuffer here on mobile browsers
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      await syncSubscriptionWithBackend(subscription, user.id);

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
