import Link from 'next/link'
import styles from './page.module.css'
import { getTeacherAssignments } from '@/app/actions/homework'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AssignmentsPage() {
    const assignments = await getTeacherAssignments()

    // Extract unique classes and count assignments
    const classStats = assignments.reduce((acc, assignment) => {
        const className = assignment.class_name || '未分類'
        if (!acc[className]) {
            acc[className] = {
                name: className,
                count: 0,
                activeCount: 0
            }
        }
        acc[className].count++
        if (!assignment.deadline || new Date(assignment.deadline) >= new Date()) {
            acc[className].activeCount++
        }
        return acc
    }, {})

    // Sort classes
    const sortedClasses = Object.values(classStats).sort((a, b) => a.name.localeCompare(b.name))

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>課題管理</h1>
                    <p className={styles.subtitle}>クラスを選択して課題を確認・作成します</p>
                </div>
                {/* Note: New Assignment button might need to ask for class first or stay here */}
                <Link href="/assignments/new" className={styles.createButton}>
                    <Plus size={20} />
                    新規課題作成
                </Link>
            </header>

            {sortedClasses.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>課題はまだ作成されていません</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {sortedClasses.map(cls => (
                        <Link
                            key={cls.name}
                            href={`/assignments/class/${encodeURIComponent(cls.name)}`}
                            className={styles.classCard}
                        >
                            <div className={styles.classCardContent}>
                                <div className={styles.classIconLarge}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                    </svg>
                                </div>
                                <h2 className={styles.className}>{cls.name}</h2>
                                <div className={styles.stats}>
                                    <span className={styles.statItem}>
                                        <span className={styles.statLabel}>進行中</span>
                                        <span className={styles.statValue}>{cls.activeCount}</span>
                                    </span>
                                    <span className={styles.statDivider}>/</span>
                                    <span className={styles.statItem}>
                                        <span className={styles.statLabel}>全課題</span>
                                        <span className={styles.statValue}>{cls.count}</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
