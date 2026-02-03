'use client'

import { useState, useEffect } from 'react'
import StudentList from '@/components/chat/StudentList'
import styles from './page.module.css'

export default function TeacherCommunicationPage() {
    const [conversations, setConversations] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchConversations = async () => {
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
        // Optional: Poll for new incoming messages from students
        const interval = setInterval(fetchConversations, 10000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>コミュニケーション</h1>
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
        </div>
    )
}
