import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import courseStyles from '@/app/(dashboard)/courses/[id]/page.module.css'
import StudentList from './StudentList'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { getClassSubmissionStats } from '@/app/actions/homework'

const DAY_NAMES = ['月', '火', '水', '木', '金']

export default async function ClassDetailPage({ params }) {
    const { id } = await params
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    const supabase = await createClient()

    // クラス詳細取得 (Same query as before)
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

    // 現在のユーザーの権限判定
    const isAdmin = adminMember.role === 'admin'
    const isOwner = classData.teacher_id === adminMember.memberId || classData.homeroom_teacher_name === adminMember.name
    const canEdit = isOwner || isAdmin

    // 学生マスターから該当クラスの学生を取得 (管理者権限で取得してRLSをバイパス)
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: students } = await adminSupabase
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

    // 提出状況統計をサーバーサイドで事前取得
    const statsData = await getClassSubmissionStats(classData.name)

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
                        {(() => {
                            const processedSchedules = (schedules || []).map(s => {
                                if (!s.period && s.start_time) {
                                    if (s.start_time.startsWith('09:00') || s.start_time.startsWith('13:10')) s.period = 1;
                                    else if (s.start_time.startsWith('09:50') || s.start_time.startsWith('14:00')) s.period = 2;
                                    else if (s.start_time.startsWith('10:50') || s.start_time.startsWith('15:00')) s.period = 3;
                                    else if (s.start_time.startsWith('11:40') || s.start_time.startsWith('15:50')) s.period = 4;
                                }
                                return s;
                            });

                            return processedSchedules?.length === 0 ? (
                                <p className={styles.empty}>設定されていません</p>
                            ) : (
                                <div className={courseStyles.scheduleGrid}>
                                    <div className={courseStyles.gridHeaderRow}>
                                        <div className={courseStyles.gridCorner}>時間 \ 曜日</div>
                                        {DAY_NAMES.map(dayName => (
                                            <div key={dayName} className={courseStyles.gridHeaderCell}>{dayName}</div>
                                        ))}
                                    </div>
                                    {[1, 2, 3, 4].map(period => (
                                        <div key={period} className={courseStyles.gridRow}>
                                            <div className={courseStyles.gridSideCell}>{period}限</div>
                                            {DAY_NAMES.map((_, dayIndex) => {
                                                const dayNum = dayIndex + 1;
                                                const subject = processedSchedules.find(s => s.day_of_week === dayNum && s.period === period);
                                                return (
                                                    <div key={dayNum} className={courseStyles.gridDataCell}>
                                                        {subject ? (
                                                            <div className={courseStyles.slotContent}>
                                                                <span className={courseStyles.slotSubject}>{subject.subject}</span>
                                                                {subject.start_time && (
                                                                    <span className={courseStyles.slotTime}>{subject.start_time.slice(0, 5)}~{subject.end_time.slice(0, 5)}</span>
                                                                )}
                                                                {subject.room && (
                                                                    <span className={courseStyles.slotRoom}>{subject.room}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className={courseStyles.emptySlot}>-</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
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
                        <StudentList students={students} initialStats={statsData} />
                    </section>
                </main>
            </div>
        </div>
    )
}
