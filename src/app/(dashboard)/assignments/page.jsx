import Link from 'next/link'
import styles from './page.module.css'
import { getTeacherAssignments } from '@/app/actions/homework'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AssignmentsPage() {
    const assignments = await getTeacherAssignments()

    // 締切でグループ分け
    const now = new Date()
    const upcoming = assignments.filter(a => !a.deadline || new Date(a.deadline) >= now)
    const past = assignments.filter(a => a.deadline && new Date(a.deadline) < now)

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

            {/* これからの課題 */}
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
                                    <div className="flex justify-between items-start">
                                        <h3>{assignment.title}</h3>
                                        <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            {assignment.class_name}
                                        </span>
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
                )}
            </section>

            {/* 過去の課題 */}
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
                                    <div className="flex justify-between items-start">
                                        <h3>{assignment.title}</h3>
                                        <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            {assignment.class_name}
                                        </span>
                                    </div>
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
        </div>
    )
}
