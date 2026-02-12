'use client'

import { useState, useEffect } from 'react'
import StudentList from '@/components/chat/StudentList'
import BroadcastModal from '@/components/chat/BroadcastModal'
import styles from './page.module.css'

export default function TeacherCommunicationPage() {
    const [conversations, setConversations] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchConversations = async () => {
            if (document.visibilityState !== 'visible') return

            try {
                const res = await fetch('/api/chat/conversations')
                if (res.ok) {
                    const data = await res.json()
                    setConversations(data.conversations || [])
                }
            } catch (error) {
                console.error('Failed to fetch conversations', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchConversations()

        // Poll for new incoming messages from students (every 60s, only when visible)
        const interval = setInterval(fetchConversations, 60000)
        return () => clearInterval(interval)
    }, [])

    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>コミュニケーション</h1>
                <button
                    className={styles.broadcastButton}
                    onClick={() => setIsBroadcastModalOpen(true)}
                >
                    一斉送信
                </button>
            </div>

            <div className={styles.content}>
                {isLoading ? (
                    <div>読み込み中...</div>
                ) : conversations.length === 0 ? (
                    <div className={styles.empty}>
                        メッセージ履歴のある学生はいません。
                    </div>
                ) : (
                    <div className={styles.listWrapper}>
                        <StudentList students={conversations} />
                    </div>
                )}
            </div>

            <BroadcastModal
                isOpen={isBroadcastModalOpen}
                onClose={() => setIsBroadcastModalOpen(false)}
                onSent={() => {
                    // Optionally refresh the student list to show the new "last_message"
                }}
            />
        </div>
    )
}
