'use client';

import { useEffect } from 'react';

export default function PWARegistry() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            const registerSW = async () => {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('SW registered:', registration.scope);
                } catch (err) {
                    console.error('SW registration failed:', err);
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
