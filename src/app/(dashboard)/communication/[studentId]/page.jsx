import ChatWindow from '@/components/chat/ChatWindow'
import styles from './chatPage.module.css'
import BackButtonClient from './BackButtonClient'
import { getMessages } from '@/app/actions/messageActions'

export default async function TeacherChatPage({ params }) {
    const { studentId } = await params

    // Pre-fetch initial messages
    const { data: initialMessages } = await getMessages(studentId, { limit: 30 })
    const reversedMessages = [...(initialMessages || [])].reverse()

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <BackButtonClient className={styles.backButton} />
                <h1 className={styles.title}>学生 ID: {studentId} とのチャット</h1>
            </div>

            <div className={styles.chatWrapper}>
                <ChatWindow
                    studentId={studentId}
                    currentUserRole="teacher"
                    initialMessages={reversedMessages}
                />
            </div>
        </div>
    )
}
