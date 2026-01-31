'use client'

import { useState } from 'react'
import styles from './MessengerConnect.module.css'

export default function MessengerConnect({ initialStatus, pageId }) {
    const [status] = useState(initialStatus)

    // Page ID fallback or error handling
    if (!pageId) {
        return (
            <div className={styles.container}>
                <p className={styles.error}>Messenger連携の設定が不完全です（Page ID不明）</p>
            </div>
        )
    }

    const connectUrl = `https://m.me/${pageId}?ref=${status.studentId}`

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.iconWrapper}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
                        <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.906 1.458 5.688 4.004 7.625.26.198.423.504.423.83v2.802c0 .907 1.057 1.39 1.745.748l2.92-2.71c.218-.202.508-.315.805-.315.686.136 1.398.22 2.103.22 5.523 0 10-4.145 10-9.243C24 6.145 19.523 2 12 2zm1.22 10.74l-2.6-2.77c-.36-.382-.962-.382-1.32 0l-4.5 4.8c-.5.534-1.09-.344-.633-.832l4.242-4.524c.362-.384.964-.384 1.325 0l2.6 2.77c.36.382.962.382 1.32 0l4.5-4.8c.5-.534 1.09.344.633.832l-4.242 4.524c-.362.384-.964.384-1.325 0z" />
                    </svg>
                </div>
                <div className={styles.info}>
                    <h3 className={styles.title}>Facebook Messenger 連携</h3>
                    <p className={styles.description}>
                        連携すると、学校からの重要なお知らせをMessengerで受け取ることができます。
                    </p>
                </div>
            </div>

            <div className={styles.action}>
                {status.connected ? (
                    <div className={styles.connectedBadge}>
                        <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        連携済み
                    </div>
                ) : (
                    <a
                        href={connectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.connectBtn}
                    >
                        Messengerと連携する
                    </a>
                )}
            </div>
        </div>
    )
}
