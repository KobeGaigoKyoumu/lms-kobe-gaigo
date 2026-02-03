'use client'

import { useParams, useRouter } from 'next/navigation'
import ChatWindow from '@/components/chat/ChatWindow'
import styles from './chatPage.module.css'
import { ArrowLeft } from 'lucide-react'

export default function TeacherChatPage() {
    const params = useParams()
    const router = useRouter()
    const studentId = params.studentId

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <ArrowLeft size={20} />
                    戻る
                </button>
                <h1 className={styles.title}>学生 ID: {studentId} とのチャット</h1>
            </div>

            <div className={styles.chatWrapper}>
                <ChatWindow
                    studentId={studentId}
                    currentUserRole="teacher"
                />
            </div>
        </div>
    )
}
