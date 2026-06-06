self.__WB_MANIFEST;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {
    title: 'VerseTogether',
    body: 'You have a new update.',
    data: { url: '/dashboard' }
  };

  const options = {
    body: payload.body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: payload.data || { url: '/dashboard' },
    vibrate: [100, 50, 100]
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'VerseTogether', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const client = clientList.find((item) => item.url === url || item.url.includes(url));
      if (client) {
        return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
