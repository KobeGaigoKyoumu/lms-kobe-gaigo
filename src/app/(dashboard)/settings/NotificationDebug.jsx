'use client';

import { useState, useEffect } from 'react';
import { Bell, RefreshCw, Smartphone, Monitor, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { subscribeUserToPush } from '@/lib/pushNotification';

export default function NotificationDebug() {
    const [permission, setPermission] = useState('loading');
    const [swRegistration, setSwRegistration] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [debugLog, setDebugLog] = useState([]);
    const [isTesting, setIsTesting] = useState(false);

    const log = (msg) => {
        setDebugLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        log('Checking environment...');

        // 1. Permission
        if (!('Notification' in window)) {
            setPermission('unsupported');
            log('Notification API not supported');
            return;
        }
        setPermission(Notification.permission);
        log(`Permission: ${Notification.permission}`);

        // 2. Service Worker
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                setSwRegistration(reg || null);
                log(reg ? `SW Active: ${reg.scope}` : 'No active Service Worker found');

                if (reg) {
                    const sub = await reg.pushManager.getSubscription();
                    setSubscription(sub);
                    log(sub ? 'Push Subscription found' : 'No Push Subscription active');
                    if (sub) {
                        try {
                            const p256dh = sub.getKey('p256dh');
                            // Minimal debug info about key presence
                            log(p256dh ? 'Key: p256dh present' : 'Key: p256dh MISSING');
                        } catch (e) { log('Error reading keys'); }
                    }
                }
            } catch (e) {
                log(`SW Check Error: ${e.message}`);
            }
        } else {
            log('Service Worker not supported');
        }
    };

    const handleRegister = async () => {
        log('Attempting to subscribe...');
        const res = await subscribeUserToPush();
        if (res.success) {
            log('Subscription successful!');
            alert('登録に成功しました！');
        } else {
            log(`Subscription failed: ${res.error}`);
            alert(`エラー: ${res.error}`);
        }
        await checkStatus();
    };

    const handleTestPush = async () => {
        setIsTesting(true);
        log('Sending test push request...');
        try {
            const res = await fetch('/api/push/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delay: 5 }) // 5秒後に通知
            });
            const data = await res.json();

            if (res.ok) {
                log(`Server Response: Success (${data.message})`);
                alert('テスト通知を送信しました。5秒後に届くはずです（ブラウザを閉じても届くか確認してください）。');
            } else {
                log(`Server Error: ${data.error}`);
                alert(`送信エラー: ${data.error}`);
            }
        } catch (e) {
            log(`Network Error: ${e.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'granted': return <CheckCircle className="text-green-500" size={20} />;
            case 'denied': return <XCircle className="text-red-500" size={20} />;
            default: return <AlertCircle className="text-yellow-500" size={20} />;
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
                <Smartphone size={20} />
                通知デバッグ・診断
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Status Panel */}
                <div className="space-y-4 rounded-lg bg-slate-50/50 p-4 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">通知権限 (Permission)</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{permission}</span>
                            {getStatusIcon(permission)}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">Service Worker</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{swRegistration ? 'Active' : 'Missing'}</span>
                            {getStatusIcon(swRegistration ? 'granted' : 'denied')}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">Push Subscription</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{subscription ? 'Registered' : 'None'}</span>
                            {getStatusIcon(subscription ? 'granted' : 'default')}
                        </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                        <button
                            onClick={handleRegister}
                            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 active:scale-95 transition-all"
                        >
                            <RefreshCw size={16} className="mr-2 inline" />
                            再登録・更新
                        </button>
                        <button
                            onClick={checkStatus}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            更新
                        </button>
                    </div>
                </div>

                {/* Test Panel */}
                <div className="space-y-4 rounded-lg bg-slate-50/50 p-4 dark:bg-slate-900/50">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        このボタンを押すと、登録済みの全端末にテスト通知を送信します。
                    </p>
                    <button
                        onClick={handleTestPush}
                        disabled={isTesting || !subscription}
                        className="w-full rounded-lg bg-emerald-600 px-3 py-3 text-base font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95"
                    >
                        {isTesting ? '送信中...' : 'テスト通知を送信 (5秒後)'}
                    </button>
                    {!subscription && (
                        <p className="text-xs text-red-500 text-center">
                            ※ 通知登録がないため送信できません
                        </p>
                    )}
                </div>
            </div>

            {/* Logs */}
            <div className="mt-6">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Debug Logs</h4>
                <div className="h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-green-400 dark:border-slate-700">
                    {debugLog.length === 0 && <span className="opacity-50">Waiting for actions...</span>}
                    {debugLog.map((line, i) => (
                        <div key={i} className="whitespace-nowrap">{line}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}
