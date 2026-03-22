// Push notification service worker for Vallo
self.addEventListener('push', (event) => {
  let data = { title: 'Vallo', body: 'Hai una nuova notifica', data: {} };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  // Determine notification type from data
  const isQuestion = data.data?.url === '/question';
  const tag = isQuestion ? 'vallo-question' : 'vallo-reminder';

  const options = {
    body: data.body,
    icon: '/notification-icon.png',
    badge: '/notification-icon.png',
    data: data.data || {},
    vibrate: isQuestion ? [300, 100, 300, 100, 300] : [200, 100, 200],
    tag,
    renotify: true,
    silent: false,
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/home';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
