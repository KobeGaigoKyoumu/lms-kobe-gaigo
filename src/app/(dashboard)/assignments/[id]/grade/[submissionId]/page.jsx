import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import GradeForm from './GradeForm'
import styles from './page.module.css'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

export default async function GradeSubmissionPage({ params }) {
    const { id, submissionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 提出物取得
    const { data: submission, error } = await supabase
        .from('submissions')
        .select(`
      *,
      student:profiles!student_id (
        full_name,
        email,
        avatar_url
      ),
      assignment:assignments (
        id,
        title,
        max_score,
        course:courses (
          teacher_id
        )
      )
    `)
        .eq('id', submissionId)
        .single()

    if (error || !submission) {
        notFound()
    }

    // 権限チェック
    const adminMember = await getAdminMemberSession()
    let isAdmin = !!adminMember
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        isAdmin = profile?.role === 'admin'
    }

    const isTeacher = user ? submission.assignment?.course?.teacher_id === user.id : false

    if (!isTeacher && !isAdmin) {
        redirect('/assignments')
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.breadcrumb}>
                    <Link href="/assignments">課題</Link>
                    <span>/</span>
                    <Link href={`/assignments/${id}`}>{submission.assignment?.title}</Link>
                    <span>/</span>
                    <span>採点</span>
                </div>

                <h1 className={styles.title}>提出物の採点</h1>
            </header>

            <div className={styles.content}>
                {/* 学生情報 */}
                <div className={styles.studentCard}>
                    <div className={styles.avatar}>
                        {submission.student?.avatar_url ? (
                            <img src={submission.student.avatar_url} alt="" />
                        ) : (
                            submission.student?.full_name?.[0] || '?'
                        )}
                    </div>
                    <div>
                        <h2>{submission.student?.full_name}</h2>
                        <p>{submission.student?.email}</p>
                    </div>
                </div>

                {/* 提出内容 */}
                <section className={styles.section}>
                    <h3>提出内容</h3>
                    <div className={styles.submissionContent}>
                        <pre>{submission.content || '（内容なし）'}</pre>
                    </div>
                    {submission.submitted_at && (
                        <p className={styles.meta}>
                            提出日時: {new Date(submission.submitted_at).toLocaleString('ja-JP')}
                        </p>
                    )}
                </section>

                {/* 採点フォーム */}
                <section className={styles.section}>
                    <h3>採点</h3>
                    <GradeForm
                        submission={submission}
                        maxScore={submission.assignment?.max_score || 100}
                    />
                </section>
            </div>
        </div>
    )
}
