// SW Version: 2026-02-16-v1
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: '新着メッセージ', body: 'メッセージが届きました' };

    // 1. ブラウザ通知を表示 (デスクトップ・スマホ共通)
    const iconUrl = new URL('/icon-192.png', self.registration.scope).href;
    const options = {
        body: data.body,
        icon: iconUrl,
        badge: iconUrl,
        data: { url: data.url },
        vibrate: [200, 100, 200],
        tag: 'chat-notification',
        renotify: true,
        requireInteraction: true,
        actions: [
            { action: 'open', title: '表示する' }
        ]
    };

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(data.title, options),
            // 2. アプリアイコンのバッジを更新 (PWA)
            (async () => {
                if ('setAppBadge' in self.navigator) {
                    try {
                        const count = parseInt(data.badge) || 1;
                        await self.navigator.setAppBadge(count);
                        console.log('SW: Badge set successfully to', count);
                    } catch (e) {
                        console.error('SW: Badge error', e);
                    }
                } else {
                    console.log('SW: setAppBadge not supported');
                }
            })()
        ])
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            const url = event.notification.data.url || '/';
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
