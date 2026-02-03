'use client'

import ChatWindow from '@/components/chat/ChatWindow'
import styles from './page.module.css'

export default function StudentCommunicationPage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>先生との連絡</h1>
            <p className={styles.description}>
                学校への連絡や質問はこちらから送ってください。
            </p>

            <div className={styles.chatWrapper}>
                <ChatWindow currentUserRole="student" />
            </div>
        </div>
    )
}
