import { getAssignmentSubmissions } from '@/app/actions/homework'
import AssignmentGradingView from '@/components/Homework/GradingView'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function AssignmentPage({ params }) {
    const resolvedParams = await params
    const id = resolvedParams.id
    const data = await getAssignmentSubmissions(id)

    if (!data) {
        return <div className={styles.empty}>課題が見つかりません。</div>
    }

    return (
        <div>
            <div className={styles.backLinkContainer}>
                <Link
                    href={`/assignments/class/${encodeURIComponent(data.assignment.class_name)}`}
                    className={styles.backLink}
                >
                    <ChevronLeft size={18} />
                    <span className={styles.backLinkLabel}>{data.assignment.class_name} の課題一覧に戻る</span>
                </Link>
            </div>
            <AssignmentGradingView
                assignment={data.assignment}
                submissions={data.submissions}
            />
        </div>
    )
}
