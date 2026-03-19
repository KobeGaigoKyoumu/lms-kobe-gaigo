import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import StudentList from './StudentList'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

export default async function ClassDetailPage({ params }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // クラス詳細取得
    const { data: classData, error } = await supabase
        .from('classes')
        .select(`
            *,
            teacher:profiles!teacher_id (
                id,
                full_name,
                avatar_url,
                email
            ),
            course:courses!course_id (
                id,
                title,
                description,
                syllabus
            )
        `)
        .eq('id', id)
        .single()

    if (error || !classData) {
        notFound()
    }

    // 現在のユーザーのプロファイル
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

    const isOwner = user ? classData.teacher_id === user.id : false
    const canEdit = isOwner || isAdmin

    // 学生マスターから該当クラスの学生を取得
    const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', classData.name)
        .eq('status', 'active')
        .order('student_id_text', { ascending: true })

    // メンバー一覧取得（ログイン済みユーザー用、互換性のため維持）
    const { data: members } = await supabase
        .from('class_members')
        .select(`
            id,
            joined_at,
            user:profiles!user_id (
                id,
                full_name,
                email,
                student_id,
                avatar_url
            )
        `)
        .eq('class_id', id)
        .order('joined_at', { ascending: true })

    // 時間割取得
    const { data: schedules } = await supabase
        .from('schedules')
        .select(`
            *,
            course:courses!course_id (
                id,
                title
            )
        `)
        .eq('class_id', id)
        .order('day_of_week', { ascending: true })

    // コースに紐づく課題取得
    let assignments = []
    if (classData.course_id) {
        const { data } = await supabase
            .from('assignments')
            .select('*')
            .eq('course_id', classData.course_id)
            .eq('is_published', true)
            .order('due_date', { ascending: true })
        assignments = data || []
    }

    const dayNames = ['日', '月', '火', '水', '木', '金', '土']

    return (
        <div className={styles.page}>
            {/* ヘッダー */}
            <header className={styles.header}>
                <div className={styles.breadcrumb}>
                    <Link href="/classes">クラス</Link>
                    <span>/</span>
                    <span>{classData.name}</span>
                </div>

                <div className={styles.headerContent}>
                    <div>
                        <div className={styles.headerMeta}>
                            <span className={styles.badge}>{classData.grade_level || '未設定'}</span>
                            <span className={styles.year}>{classData.academic_year}年度</span>
                        </div>
                        <h1 className={styles.title}>{classData.name}</h1>
                        <p className={styles.description}>{classData.description || '説明なし'}</p>
                    </div>

                    {canEdit && (
                        <Link href={`/classes/${id}/edit`} className={styles.editBtn}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                            </svg>
                            編集
                        </Link>
                    )}
                </div>
            </header>

            <div className={styles.content}>
                {/* サイドバー */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarCard}>
                        <h3>担当教師</h3>
                        <div className={styles.teacher}>
                            <div className={styles.teacherAvatar}>
                                {classData.teacher?.avatar_url ? (
                                    <img src={classData.teacher.avatar_url} alt="" />
                                ) : (
                                    (classData.homeroom_teacher_name?.[0] || classData.teacher?.full_name?.[0]) || '?'
                                )}
                            </div>
                            <div>
                                <p className={styles.teacherName}>{classData.homeroom_teacher_name || classData.teacher?.full_name}</p>
                                {!classData.homeroom_teacher_name && <p className={styles.teacherEmail}>{classData.teacher?.email}</p>}
                            </div>
                        </div>
                    </div>

                    {classData.course && (
                        <div className={styles.sidebarCard}>
                            <h3>コース情報</h3>
                            <Link href={`/courses/${classData.course.id}`} className={styles.courseLink}>
                                <h4>{classData.course.title}</h4>
                                <p>{classData.course.description || '説明なし'}</p>
                            </Link>
                        </div>
                    )}

                    <div className={styles.sidebarCard}>
                        <h3>クラス情報</h3>
                        <dl className={styles.infoList}>
                            <div>
                                <dt>在籍者数</dt>
                                <dd>{students?.length || 0}名</dd>
                            </div>
                            <div>
                                <dt>作成日</dt>
                                <dd>{new Date(classData.created_at).toLocaleDateString('ja-JP')}</dd>
                            </div>
                        </dl>
                    </div>
                </aside>

                {/* メインコンテンツ */}
                <main className={styles.main}>
                    {/* シラバス */}
                    {classData.course?.syllabus && (
                        <section className={styles.section}>
                            <h2>シラバス</h2>
                            <div className={styles.syllabusContent}>
                                <pre>{classData.course.syllabus}</pre>
                            </div>
                        </section>
                    )}

                    {/* 時間割 */}
                    <section className={styles.section}>
                        <h2>時間割</h2>
                        {schedules?.length === 0 ? (
                            <p className={styles.empty}>設定されていません</p>
                        ) : (
                            <div className={styles.scheduleList}>
                                {schedules.map(schedule => (
                                    <div key={schedule.id} className={styles.scheduleCard}>
                                        <div className={styles.scheduleDay}>{['日', '月', '火', '水', '木', '金', '土'][schedule.day_of_week]}曜日</div>
                                        <div className={styles.scheduleTime}>
                                            {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                                        </div>
                                        {schedule.room && (
                                            <div className={styles.scheduleRoom}>{schedule.room}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* 課題 */}
                    {classData.course_id && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>課題</h2>
                                {canEdit && (
                                    <Link href={`/courses/${classData.course_id}/assignments/new`} className={styles.addBtn}>
                                        + 課題を追加
                                    </Link>
                                )}
                            </div>

                            {assignments.length === 0 ? (
                                <p className={styles.empty}>課題がありません</p>
                            ) : (
                                <div className={styles.assignmentList}>
                                    {assignments.map(assignment => (
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
                    )}

                    {/* 在籍者一覧 */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>在籍者一覧 ({students?.length || 0}名)</h2>
                        </div>
                        <StudentList students={students} />
                    </section>
                </main>
            </div>
        </div>
    )
}
