import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

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

    // 課題一覧取得
    const { data: assignments } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', id)
        .order('due_date', { ascending: true })

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
                        </dl>
                    </div>
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
                </main>
            </div>
        </div>
    )
}
