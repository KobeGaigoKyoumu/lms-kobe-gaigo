import ChatWindow from '@/components/chat/ChatWindow'
import styles from './page.module.css'
import { getStudentSession } from '@/app/actions/studentAuth'
import { redirect } from 'next/navigation'

export default async function StudentCommunicationPage() {
    const session = await getStudentSession()

    if (!session || !session.studentId) {
        redirect('/login')
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>先生との連絡</h1>
            <p className={styles.description}>
                学校への連絡や質問はこちらから送ってください。
            </p>

            <div className={styles.chatWrapper}>
                <ChatWindow
                    studentId={session.studentId}
                    currentUserRole="student"
                />
            </div>
        </div>
    )
}
