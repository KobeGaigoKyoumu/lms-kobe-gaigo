'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

export default function PWARegistry() {
    const [status, setStatus] = useState('loading'); // loading, default, granted, denied
    const [showBanner, setShowBanner] = useState(false);

    const checkPermission = () => {
        if (!('Notification' in window)) return 'unsupported';
        return Notification.permission;
    };

    useEffect(() => {
        const currentPermission = checkPermission();
        setStatus(currentPermission);
        if (currentPermission === 'default') {
            setShowBanner(true);
        }

        if ('serviceWorker' in navigator) {
            const setupPush = async () => {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('SW registered:', registration.scope);

                    // もし既に許可されているなら、自動的に購読処理を行う
                    if (Notification.permission === 'granted') {
                        await subscribeUser(registration);
                    }
                } catch (err) {
                    console.error('SW registration failed:', err);
                }
            };

            if (document.readyState === 'complete') {
                setupPush();
            } else {
                window.addEventListener('load', setupPush);
            }
        }
    }, []);

    const subscribeUser = async (registration) => {
        try {
            let subscription = await registration.pushManager.getSubscription();
            const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!VAPID_PUBLIC_KEY) return;

            const urlBase64ToUint8Array = (base64String) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };

            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

            if (subscription) {
                const currentKey = new Uint8Array(subscription.options.applicationServerKey);
                let isSameKey = currentKey.length === convertedVapidKey.length;
                if (isSameKey) {
                    for (let i = 0; i < currentKey.length; i++) {
                        if (currentKey[i] !== convertedVapidKey[i]) {
                            isSameKey = false;
                            break;
                        }
                    }
                }

                if (!isSameKey) {
                    await subscription.unsubscribe();
                    subscription = null;
                }
            }

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }

            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription })
            });

        } catch (err) {
            console.error('Push subscription failed:', err);
        }
    };

    const handleEnableNotifications = async () => {
        try {
            const permission = await Notification.requestPermission();
            setStatus(permission);
            if (permission === 'granted') {
                setShowBanner(false);
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    await subscribeUser(registration);
                }
            } else {
                // denied の場合は案内を表示し続けるか、一定期間隠す
                alert('通知がブロックされました。ブラウザの設定から通知を許可してください。');
            }
        } catch (err) {
            console.error('Permission request failed:', err);
        }
    };

    if (!showBanner || status !== 'default') return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-8 md:bottom-8 md:w-96 animate-in slide-in-from-bottom duration-500">
            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/70 p-5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
                <button
                    onClick={() => setShowBanner(false)}
                    className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                    <X size={18} />
                </button>

                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                        <Bell className="animate-bounce" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 dark:text-white">
                            メッセージ通知を有効にしますか？
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            新しいメッセージが届いた時に、スマホやPCに通知を受け取ることができます。
                        </p>
                        <button
                            onClick={handleEnableNotifications}
                            className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95"
                        >
                            通知を有効にする
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
