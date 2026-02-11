
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
    if (!base64String) return null;
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeUserToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        return { success: false, error: 'このブラウザはプッシュ通知に対応していません' };
    }

    if (!publicVapidKey) {
        console.error('VAPID Public Key is missing');
        return { success: false, error: 'サーバー設定エラー: VAPID Keyがありません' };
    }

    try {
        // Register Service Worker if not already registered
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        // Check current permission
        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
            console.log('Notification permission not granted');
            return { success: false, error: '通知の権限が許可されていません' };
        }

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        // Send subscription to server
        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            body: JSON.stringify({ subscription }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'サーバーへの保存に失敗しました');
        }

        console.log('Push subscription successful', subscription);
        return { success: true };

    } catch (error) {
        console.error('Error subscribing to push:', error);
        return { success: false, error: error.message || '不明なエラーが発生しました' };
    }
}
