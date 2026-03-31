import { getStudentAssignments } from '@/app/actions/homework'
export const dynamic = 'force-dynamic'
import HomeworkListClient from './HomeworkListClient'
import styles from './page.module.css'

export default async function StudentHomeworkPage() {
    const assignments = await getStudentAssignments()

    // Handle error case appropriately
    const safeData = (assignments && !assignments.error) ? assignments : { active: [], archived: [] }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>課題一覧</h1>
                <p className={styles.subtitle}>提出期限を確認して、計画的に進めましょう</p>
            </div>

            <HomeworkListClient assignmentsData={safeData} />
        </div>
    )
}
