import { getClassesList, getTimetableSubjects, getAssignmentForCopy } from '@/app/actions/homework'
import AssignmentForm from '@/components/Homework/AssignmentForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function NewAssignmentPage({ searchParams }) {
    const resolvedSearchParams = await searchParams
    const copyFromId = resolvedSearchParams?.copyFrom

    const [classes, subjects, copyData] = await Promise.all([
        getClassesList(),
        getTimetableSubjects(),
        copyFromId ? getAssignmentForCopy(copyFromId) : Promise.resolve(null)
    ])

    return (
        <div className={styles.container}>
            <Link href="/assignments" className={styles.backLink}>
                <ChevronLeft size={16} />
                一覧に戻る
            </Link>

            <h1 className={styles.title}>
                {copyData ? '課題をコピーして新規作成' : '新規課題作成'}
            </h1>

            <AssignmentForm classes={classes} subjects={subjects} initialData={copyData} />
        </div>
    )
}
