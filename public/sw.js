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

    // Default options (Standard)
    let options = {
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

    // Simple Mode (Minimal options for troubleshooting)
    if (data.simpleMode) {
        console.log('SW: Simple Mode Notification');
        options = {
            body: data.body,
            icon: iconUrl, // Still try icon, it's usually fine
            // No badge, no vibrate, no actions, no renotify
            tag: 'simple-test-' + Date.now()
        };
    }

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
        (async () => {
            try {
                const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
                const url = event.notification.data ? event.notification.data.url : '/';

                for (const client of clientList) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            } catch (error) {
                console.error('SW: Notification click error', error);
            }
        })()
    );
});
