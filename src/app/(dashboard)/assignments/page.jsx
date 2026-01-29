import Link from 'next/link'
import styles from './page.module.css'
import { getTeacherAssignments } from '@/app/actions/homework'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AssignmentsPage() {
    const assignments = await getTeacherAssignments()

    // Group by class
    const assignmentsByClass = assignments.reduce((acc, assignment) => {
        const className = assignment.class_name || '未分類'
        if (!acc[className]) {
            acc[className] = []
        }
        acc[className].push(assignment)
        return acc
    }, {})

    // Sort classes (optional, e.g., alphabetical)
    const sortedClasses = Object.keys(assignmentsByClass).sort()

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>課題管理</h1>
                    <p className={styles.subtitle}>課題の作成・配布・採点</p>
                </div>
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
                <div className={styles.classSections}>
                    {sortedClasses.map(className => (
                        <section key={className} className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <div className={styles.classIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                {className}
                                <span className={styles.countBadge}>
                                    {assignmentsByClass[className].length}
                                </span>
                            </h2>

                            <div className={styles.list}>
                                {assignmentsByClass[className].map(assignment => (
                                    <Link
                                        href={`/assignments/${assignment.id}`}
                                        key={assignment.id}
                                        className={styles.card}
                                    >
                                        <div className={styles.cardMain}>
                                            <div className="flex justify-between items-start">
                                                <h3>{assignment.title}</h3>
                                                {/* Status Badge based on deadline */}
                                                {assignment.deadline && new Date(assignment.deadline) < new Date() && (
                                                    <span className={styles.statusPast}>終了</span>
                                                )}
                                            </div>
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
                        </section>
                    ))}
                </div>
            )}
        </div>
    )
}
