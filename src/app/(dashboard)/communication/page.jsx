'use client'

import { useState, useEffect } from 'react'
import StudentList from '@/components/chat/StudentList'
import BroadcastModal from '@/components/chat/BroadcastModal'
import styles from './page.module.css'
import { getConversations } from '@/app/actions/communication'

export default function TeacherCommunicationPage() {
    const [conversations, setConversations] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let intervalId = null

        const fetchConversations = async () => {
            try {
                const data = await getConversations()
                setConversations(data)
            } catch (error) {
                console.error('Failed to fetch conversations', error)
            } finally {
                setIsLoading(false)
            }
        }

        const startPolling = () => {
            fetchConversations()
            intervalId = setInterval(fetchConversations, 300000)
        }

        const stopPolling = () => {
            if (intervalId) { clearInterval(intervalId); intervalId = null }
        }

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                startPolling()
            } else {
                stopPolling()
            }
        }

        // Start if page is visible
        if (document.visibilityState === 'visible') {
            startPolling()
        }

        document.addEventListener('visibilitychange', handleVisibility)
        return () => {
            stopPolling()
            document.removeEventListener('visibilitychange', handleVisibility)
        }
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
