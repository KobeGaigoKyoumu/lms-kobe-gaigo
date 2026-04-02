import { getStudentSession, getStudentAssignments } from '@/app/actions/homework'
import { redirect } from 'next/navigation'
import HomeworkListClient from './HomeworkListClient'
import styles from './page.module.css'

export default async function StudentHomeworkPage() {
    const session = await getStudentSession()

    if (!session) {
        redirect('/login')
    }

    const assignmentsData = await getStudentAssignments()

    if (assignmentsData.error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>エラーが発生しました。</div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>課題一覧</h1>
                <p className={styles.subtitle}>提出期限を確認して、計画的に進めましょう</p>
            </div>

            <HomeworkListClient assignmentsData={assignmentsData} />
        </div>
    )
}
