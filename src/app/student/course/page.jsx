import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStudentSession } from '@/app/actions/studentAuth'
import Link from 'next/link'
import styles from './page.module.css'
import courseStyles from '@/app/(dashboard)/courses/[id]/page.module.css'

const DAY_NAMES = ['月', '火', '水', '木', '金']

export default async function StudentCoursePage() {
    const session = await getStudentSession()

    if (!session) {
        redirect('/login')
    }

    const supabase = await createClient()

    // クラス詳細取得 (session.classNameを元に検索)
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
                description
            )
        `)
        .eq('name', session.className)
        .single()

    if (error || !classData) {
        return (
            <div className={styles.page}>
                <header className={styles.header}>
                    <h1 className={styles.title}>コース情報</h1>
                </header>
                <div className={styles.content}>
                    <p className={styles.empty}>現在、所属クラスの情報が見つかりません。</p>
                </div>
            </div>
        )
    }

    // 学生マスターから該当クラスの学生を取得（在籍者数用）
    const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('class_name', classData.name)
        .eq('status', 'active')

    // 時間割取得
    const { data: schedules } = await supabase
        .from('schedules')
        .select(`
            *
        `)
        .eq('class_id', classData.id)
        .order('day_of_week', { ascending: true })

    return (
        <div className={styles.page}>
            {/* ヘッダー */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div>
                        <div className={styles.headerMeta}>
                            <span className={styles.badge}>{classData.grade_level || '未設定'}</span>
                            <span className={styles.year}>{classData.academic_year}年度</span>
                        </div>
                        <h1 className={styles.title}>{classData.name} - コース情報</h1>
                    </div>
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
                            </div>
                        </div>
                    </div>

                    {classData.course && (
                        <div className={styles.sidebarCard}>
                            <h3>コース情報</h3>
                            <div className={styles.courseInfo}>
                                <h4>{classData.course.title}</h4>
                                <p>{classData.course.description || '説明なし'}</p>
                            </div>
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
                </main>
            </div>
        </div>
    )
}
