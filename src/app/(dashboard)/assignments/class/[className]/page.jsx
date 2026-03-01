import { getAssignmentsByClass, getClassSubmissionMatrix } from '@/app/actions/homework'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import styles from './page.module.css'
import SubmissionMatrix from './SubmissionMatrix'

export default async function ClassAssignmentsPage({ params }) {
    const resolvedParams = await params
    const className = decodeURIComponent(resolvedParams.className)
    const [assignments, matrixData] = await Promise.all([
        getAssignmentsByClass(className),
        getClassSubmissionMatrix(className)
    ])

    const now = new Date()
    const upcoming = assignments.filter(a => !a.deadline || new Date(a.deadline) >= now)
    const past = assignments.filter(a => a.deadline && new Date(a.deadline) < now)

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <Link href="/assignments" className={styles.backLink}>
                        <ChevronLeft size={16} />
                        クラス一覧に戻る
                    </Link>
                    <h1 className={styles.title}>
                        <div className={styles.classIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        {className}
                    </h1>
                    <p className={styles.subtitle}>課題一覧</p>
                </div>
            </header>

            {/* Upcoming Assignments */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="10" cy="10" r="8" />
                        <path d="M10 6v4l2 2" />
                    </svg>
                    進行中の課題 ({upcoming.length})
                </h2>

                {upcoming.length === 0 ? (
                    <p className={styles.empty}>進行中の課題はありません</p>
                ) : (
                    <div className={styles.list}>
                        {upcoming.map(assignment => (
                            <Link
                                href={`/assignments/${assignment.id}`}
                                key={assignment.id}
                                className={styles.card}
                            >
                                <div className={styles.cardMain}>
                                    <h3>{assignment.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1 truncate">{assignment.description}</p>
                                </div>
                                <div className={styles.cardMeta}>
                                    {assignment.deadline ? (
                                        <span className={styles.dueDate}>
                                            締切: {new Date(assignment.deadline).toLocaleDateString('ja-JP', {
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    ) : (
                                        <span className={styles.noDue}>締切なし</span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Past Assignments */}
            {past.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
                            <path d="M7 10l2 2 4-4" />
                        </svg>
                        終了した課題 ({past.length})
                    </h2>

                    <div className={styles.list}>
                        {past.map(assignment => (
                            <Link
                                href={`/assignments/${assignment.id}`}
                                key={assignment.id}
                                className={`${styles.card} ${styles.past}`}
                            >
                                <div className={styles.cardMain}>
                                    <h3>{assignment.title}</h3>
                                </div>
                                <div className={styles.cardMeta}>
                                    <span className={styles.dueDate}>
                                        締切: {new Date(assignment.deadline).toLocaleDateString('ja-JP')}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Submission Matrix Table */}
            <SubmissionMatrix
                students={matrixData.students}
                assignments={matrixData.assignments}
                submissions={matrixData.submissions}
            />
        </div>
    )
}

