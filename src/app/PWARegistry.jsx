'use client';

import { useEffect } from 'react';

export default function PWARegistry() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            const registerSW = async () => {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('SW registered:', registration.scope);

                    // 1. 通知の許可を求める
                    if (Notification.permission === 'default') {
                        const permission = await Notification.requestPermission();
                        if (permission !== 'granted') return;
                    }

                    // 2. プッシュ通知の購読
                    let subscription = await registration.pushManager.getSubscription();
                    if (!subscription) {
                        const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                        if (!VAPID_PUBLIC_KEY) return;

                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: VAPID_PUBLIC_KEY
                        });
                    }

                    // 3. サーバーへ購読情報を保存
                    await fetch('/api/push/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subscription })
                    });

                } catch (err) {
                    console.error('Push setup failed:', err);
                }
            };

            if (document.readyState === 'complete') {
                registerSW();
            } else {
                window.addEventListener('load', registerSW);
            }
        }
    }, []);

    return null;
}
