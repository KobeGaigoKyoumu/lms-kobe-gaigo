import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import EnrollmentManager from './EnrollmentManager'

export default async function CourseDetailPage({ params }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // コース詳細取得
    const { data: course, error } = await supabase
        .from('courses')
        .select(`
      *,
      teacher:profiles!teacher_id (
        id,
        full_name,
        avatar_url,
        email
      )
    `)
        .eq('id', id)
        .single()

    if (error || !course) {
        notFound()
    }

    // 現在のユーザーのプロファイル
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    const isOwner = course.teacher_id === user?.id
    const isAdmin = profile?.role === 'admin'
    const canEdit = isOwner || isAdmin
    const isStudent = profile?.role === 'student'

    // 課題一覧取得
    const { data: assignments } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', id)
        .order('due_date', { ascending: true })

    // 登録者一覧取得（教師・管理者のみ表示）
    let enrollments = []
    if (canEdit) {
        const { data } = await supabase
            .from('course_enrollments')
            .select(`
                id,
                enrolled_at,
                user:profiles!user_id (
                    id,
                    full_name,
                    email,
                    student_id,
                    avatar_url
                )
            `)
            .eq('course_id', id)
            .order('enrolled_at', { ascending: false })
        enrollments = data || []
    }

    // 学生の場合：登録状況を確認
    let isEnrolled = false
    if (isStudent) {
        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('course_id', id)
            .eq('user_id', user?.id)
            .single()
        isEnrolled = !!enrollment
    }

    return (
        <div className={styles.page}>
            {/* ヘッダー */}
            <header className={styles.header}>
                <div className={styles.breadcrumb}>
                    <Link href="/courses">コース</Link>
                    <span>/</span>
                    <span>{course.title}</span>
                </div>

                <div className={styles.headerContent}>
                    <div>
                        <div className={styles.headerMeta}>
                            <span className={`${styles.badge} ${course.is_published ? styles.published : styles.draft}`}>
                                {course.is_published ? '公開中' : '下書き'}
                            </span>
                        </div>
                        <h1 className={styles.title}>{course.title}</h1>
                        <p className={styles.description}>{course.description || '説明なし'}</p>
                    </div>

                    {canEdit && (
                        <Link href={`/courses/${id}/edit`} className={styles.editBtn}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                            </svg>
                            編集
                        </Link>
                    )}
                </div>
            </header>

            <div className={styles.content}>
                {/* サイドバー情報 */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarCard}>
                        <h3>担当教師</h3>
                        <div className={styles.teacher}>
                            <div className={styles.teacherAvatar}>
                                {course.teacher?.avatar_url ? (
                                    <img src={course.teacher.avatar_url} alt="" />
                                ) : (
                                    course.teacher?.full_name?.[0] || '?'
                                )}
                            </div>
                            <div>
                                <p className={styles.teacherName}>{course.teacher?.full_name}</p>
                                <p className={styles.teacherEmail}>{course.teacher?.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.sidebarCard}>
                        <h3>コース情報</h3>
                        <dl className={styles.infoList}>
                            <div>
                                <dt>作成日</dt>
                                <dd>{new Date(course.created_at).toLocaleDateString('ja-JP')}</dd>
                            </div>
                            <div>
                                <dt>更新日</dt>
                                <dd>{new Date(course.updated_at).toLocaleDateString('ja-JP')}</dd>
                            </div>
                            <div>
                                <dt>課題数</dt>
                                <dd>{assignments?.length || 0}件</dd>
                            </div>
                            <div>
                                <dt>登録者数</dt>
                                <dd>{enrollments?.length || 0}名</dd>
                            </div>
                        </dl>
                    </div>

                    {/* 学生用：登録ボタン */}
                    {isStudent && course.is_published && (
                        <EnrollmentManager
                            courseId={id}
                            userId={user?.id}
                            isEnrolled={isEnrolled}
                        />
                    )}
                </aside>

                {/* メインコンテンツ */}
                <main className={styles.main}>
                    {/* シラバス */}
                    <section className={styles.section}>
                        <h2>シラバス</h2>
                        <div className={styles.syllabusContent}>
                            {course.syllabus ? (
                                <pre>{course.syllabus}</pre>
                            ) : (
                                <p className={styles.empty}>シラバスが登録されていません</p>
                            )}
                        </div>
                    </section>

                    {/* 課題一覧 */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>課題</h2>
                            {canEdit && (
                                <Link href={`/courses/${id}/assignments/new`} className={styles.addBtn}>
                                    + 課題を追加
                                </Link>
                            )}
                        </div>

                        {assignments?.length === 0 ? (
                            <p className={styles.empty}>課題がありません</p>
                        ) : (
                            <div className={styles.assignmentList}>
                                {assignments?.map(assignment => (
                                    <Link
                                        href={`/assignments/${assignment.id}`}
                                        key={assignment.id}
                                        className={styles.assignmentCard}
                                    >
                                        <div>
                                            <h4>{assignment.title}</h4>
                                            <p>{assignment.description || '説明なし'}</p>
                                        </div>
                                        <div className={styles.dueDate}>
                                            {assignment.due_date ? (
                                                <>
                                                    <span>締切:</span>
                                                    {new Date(assignment.due_date).toLocaleDateString('ja-JP')}
                                                </>
                                            ) : (
                                                '締切なし'
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* 登録者一覧（教師・管理者のみ） */}
                    {canEdit && (
                        <section className={styles.section}>
                            <h2>登録者一覧 ({enrollments?.length || 0}名)</h2>

                            {enrollments?.length === 0 ? (
                                <p className={styles.empty}>登録者がいません</p>
                            ) : (
                                <div className={styles.enrollmentList}>
                                    {enrollments?.map(enrollment => (
                                        <div key={enrollment.id} className={styles.enrollmentCard}>
                                            <div className={styles.enrollmentUser}>
                                                <div className={styles.userAvatar}>
                                                    {enrollment.user?.avatar_url ? (
                                                        <img src={enrollment.user.avatar_url} alt="" />
                                                    ) : (
                                                        enrollment.user?.full_name?.[0] || '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={styles.userName}>{enrollment.user?.full_name}</p>
                                                    <p className={styles.userMeta}>
                                                        {enrollment.user?.student_id && (
                                                            <span>学籍番号: {enrollment.user.student_id}</span>
                                                        )}
                                                        {enrollment.user?.email && (
                                                            <span>{enrollment.user.email}</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={styles.enrolledAt}>
                                                {new Date(enrollment.enrolled_at).toLocaleDateString('ja-JP')}登録
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </main>
            </div>
        </div>
    )
}
