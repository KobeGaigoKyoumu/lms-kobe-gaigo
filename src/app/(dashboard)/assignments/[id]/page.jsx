import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import SubmissionForm from './SubmissionForm'

export default async function AssignmentDetailPage({ params }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 課題詳細取得
    const { data: assignment, error } = await supabase
        .from('assignments')
        .select(`
      *,
      course:courses (
        id,
        title,
        teacher_id
      )
    `)
        .eq('id', id)
        .single()

    if (error || !assignment) {
        notFound()
    }

    // 現在のユーザーのプロファイル
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    const isTeacher = assignment.course?.teacher_id === user?.id
    const isAdmin = profile?.role === 'admin'
    const canGrade = isTeacher || isAdmin
    const isStudent = profile?.role === 'student'

    // 学生の提出物を取得
    const { data: submission } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', id)
        .eq('student_id', user?.id)
        .single()

    // 教師の場合は全提出物を取得
    let allSubmissions = []
    if (canGrade) {
        const { data } = await supabase
            .from('submissions')
            .select(`
        *,
        student:profiles!student_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
            .eq('assignment_id', id)
            .order('submitted_at', { ascending: false })
        allSubmissions = data || []
    }

    const isPastDue = assignment.due_date && new Date(assignment.due_date) < new Date()

    return (
        <div className={styles.page}>
            {/* ヘッダー */}
            <header className={styles.header}>
                <div className={styles.breadcrumb}>
                    <Link href="/assignments">課題</Link>
                    <span>/</span>
                    <span>{assignment.title}</span>
                </div>

                <div className={styles.headerContent}>
                    <div>
                        <h1 className={styles.title}>{assignment.title}</h1>
                        <Link href={`/courses/${assignment.course?.id}`} className={styles.courseName}>
                            {assignment.course?.title}
                        </Link>
                    </div>

                    <div className={styles.meta}>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>配点</span>
                            <span className={styles.metaValue}>{assignment.max_score}点</span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>締切</span>
                            <span className={`${styles.metaValue} ${isPastDue ? styles.pastDue : ''}`}>
                                {assignment.due_date
                                    ? new Date(assignment.due_date).toLocaleDateString('ja-JP', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                    : '締切なし'
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className={styles.content}>
                {/* 課題説明 */}
                <section className={styles.section}>
                    <h2>課題内容</h2>
                    <div className={styles.description}>
                        {assignment.description || '説明がありません'}
                    </div>
                </section>

                {/* 学生: 提出フォーム */}
                {isStudent && (
                    <section className={styles.section}>
                        <h2>提出</h2>
                        <SubmissionForm
                            assignmentId={id}
                            submission={submission}
                            isPastDue={isPastDue}
                            maxScore={assignment.max_score}
                        />
                    </section>
                )}

                {/* 教師: 提出物一覧 */}
                {canGrade && (
                    <section className={styles.section}>
                        <h2>提出物一覧 ({allSubmissions.length}件)</h2>

                        {allSubmissions.length === 0 ? (
                            <p className={styles.empty}>まだ提出がありません</p>
                        ) : (
                            <div className={styles.submissionList}>
                                {allSubmissions.map(sub => (
                                    <div key={sub.id} className={styles.submissionCard}>
                                        <div className={styles.studentInfo}>
                                            <div className={styles.avatar}>
                                                {sub.student?.avatar_url ? (
                                                    <img src={sub.student.avatar_url} alt="" />
                                                ) : (
                                                    sub.student?.full_name?.[0] || '?'
                                                )}
                                            </div>
                                            <div>
                                                <p className={styles.studentName}>{sub.student?.full_name}</p>
                                                <p className={styles.studentEmail}>{sub.student?.email}</p>
                                            </div>
                                        </div>

                                        <div className={styles.submissionMeta}>
                                            <span className={`${styles.status} ${styles[sub.status]}`}>
                                                {sub.status === 'graded' ? '採点済み' :
                                                    sub.status === 'submitted' ? '提出済み' : '下書き'}
                                            </span>
                                            {sub.score !== null && (
                                                <span className={styles.score}>{sub.score}/{assignment.max_score}点</span>
                                            )}
                                        </div>

                                        <Link
                                            href={`/assignments/${id}/grade/${sub.id}`}
                                            className={styles.gradeBtn}
                                        >
                                            {sub.status === 'graded' ? '確認' : '採点'}
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    )
}
