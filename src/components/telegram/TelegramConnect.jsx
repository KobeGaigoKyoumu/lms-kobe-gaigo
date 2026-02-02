'use client'

import { useState, useTransition } from 'react'
import styles from './TelegramConnect.module.css'
import { disconnectTelegram } from '@/actions/telegram'
import { useRouter, usePathname } from 'next/navigation'

export default function TelegramConnect({ initialStatus, botUsername }) {
    const [status, setStatus] = useState(initialStatus)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const pathname = usePathname()

    const handleDisconnect = async () => {
        if (!confirm('Telegram連携を解除しますか？')) return

        startTransition(async () => {
            const res = await disconnectTelegram()
            if (res.success) {
                setStatus(prev => ({ ...prev, connected: false }))
                router.refresh()
            } else {
                alert('解除に失敗しました: ' + (res.error || 'Unknown error'))
            }
        })
    }

    // Bot username fallback
    if (!botUsername) {
        return (
            <div className={styles.container}>
                <p className={styles.error}>Telegram連携の設定が不完全です（Bot Username不明）</p>
            </div>
        )
    }

    // Missing Student ID check
    if (!status?.studentId && !status?.connected) {
        return (
            <div className={styles.container} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                <p className={styles.error} style={{ color: 'red', fontWeight: 'bold' }}>
                    エラー: 学生IDが取得できませんでした (v4)
                </p>
                <details style={{ fontSize: '0.75rem', color: '#666', width: '100%' }}>
                    <summary>Debug Info</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', background: '#eee', padding: '8px', borderRadius: '4px' }}>
                        Path: {pathname}{'\n'}
                        Status: {JSON.stringify(status, null, 2)}{'\n'}
                        Bot: {botUsername}
                    </pre>
                </details>
            </div>
        )
    }

    const connectUrl = `https://t.me/${botUsername}?start=${status.studentId}`

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.iconWrapper}>
                    {/* Telegram Icon */}
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                </div>
                <div className={styles.info}>
                    <h3 className={styles.title}>Telegram 連携</h3>
                    <p className={styles.description}>
                        連携すると、学校からの重要なお知らせをTelegramで受け取ることができます。
                    </p>
                </div>
            </div>

            <div className={styles.action}>
                {status.connected ? (
                    <div className={styles.connectedWrapper}>
                        <div className={styles.connectedBadge}>
                            <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>連携済み</span>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            disabled={isPending}
                            className={styles.disconnectBtn}
                        >
                            {isPending ? '解除中...' : '解除する'}
                        </button>
                    </div>
                ) : (
                    <a
                        href={connectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.connectBtn}
                    >
                        Telegramと連携する
                    </a>
                )}
            </div>
        </div>
    )
}
