import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'

export default async function AssignmentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // プロファイル取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    // 課題一覧取得
    const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
      *,
      course:courses (
        id,
        title
      )
    `)
        .order('due_date', { ascending: true })

    const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'

    // 締切でグループ分け
    const now = new Date()
    const upcoming = assignments?.filter(a => !a.due_date || new Date(a.due_date) >= now) || []
    const past = assignments?.filter(a => a.due_date && new Date(a.due_date) < now) || []

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>課題</h1>
                    <p className={styles.subtitle}>課題の提出と管理</p>
                </div>
            </header>

            {error && (
                <div className={styles.error}>課題の取得に失敗しました</div>
            )}

            {/* これからの課題 */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="10" cy="10" r="8" />
                        <path d="M10 6v4l2 2" />
                    </svg>
                    これからの課題 ({upcoming.length})
                </h2>

                {upcoming.length === 0 ? (
                    <p className={styles.empty}>現在提出期限内の課題はありません</p>
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
                                    <p className={styles.courseName}>{assignment.course?.title}</p>
                                </div>
                                <div className={styles.cardMeta}>
                                    {assignment.due_date ? (
                                        <span className={styles.dueDate}>
                                            締切: {new Date(assignment.due_date).toLocaleDateString('ja-JP', {
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    ) : (
                                        <span className={styles.noDue}>締切なし</span>
                                    )}
                                    <span className={styles.score}>配点: {assignment.max_score}点</span>
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
                        過去の課題 ({past.length})
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
                                    <p className={styles.courseName}>{assignment.course?.title}</p>
                                </div>
                                <div className={styles.cardMeta}>
                                    <span className={styles.dueDate}>
                                        締切: {new Date(assignment.due_date).toLocaleDateString('ja-JP')}
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
