self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: '新着メッセージ', body: 'メッセージが届きました' };

    // 1. ブラウザ通知を表示 (デスクトップ・スマホ共通)
    const options = {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url },
        vibrate: [100, 50, 100],
        tag: 'chat-notification', // 同一タグは最新のみ表示
        renotify: true
    };

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(data.title, options),
            // 2. アプリアイコンのバッジを更新 (PWA)
            'setAppBadge' in navigator ? navigator.setAppBadge(data.badge) : Promise.resolve()
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
