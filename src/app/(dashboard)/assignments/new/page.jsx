import { getClassesList } from '@/app/actions/homework'
import { fetchCachedCourses } from '@/app/actions/courseData'
import AssignmentForm from '@/components/Homework/AssignmentForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function NewAssignmentPage() {
    const [classes, courses] = await Promise.all([
        getClassesList(),
        fetchCachedCourses()
    ])

    return (
        <div className={styles.container}>
            <Link href="/assignments" className={styles.backLink}>
                <ChevronLeft size={16} />
                一覧に戻る
            </Link>

            <h1 className={styles.title}>新規課題作成</h1>

            <AssignmentForm classes={classes} courses={courses} />
        </div>
    )
}
