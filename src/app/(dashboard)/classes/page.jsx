import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'

// 60秒間キャッシュ
export const revalidate = 60
export default async function ClassesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // プロファイルとクラス一覧と学生マスターを並列取得
    const [profileResult, classesResult, studentsResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id)
            .single(),
        supabase
            .from('classes')
            .select(`
                *,
                teacher:profiles!teacher_id (
                    id,
                    full_name,
                    avatar_url
                ),
                course:courses!course_id (
                    id,
                    title
                )
            `)
            .order('created_at', { ascending: false }),
        supabase
            .from('students')
            .select('class_name')
            .eq('status', 'active')
    ])

    const profile = profileResult.data
    const allClassesRaw = classesResult.data || []
    const students = studentsResult.data || []
    const error = classesResult.error

    // クラスごとの学生数をカウント
    const studentCountByClass = {}
    students.forEach(s => {
        if (s.class_name) {
            studentCountByClass[s.class_name] = (studentCountByClass[s.class_name] || 0) + 1
        }
    })

    // 学生数を各クラスに追加
    const allClasses = allClassesRaw.map(cls => ({
        ...cls,
        studentCount: studentCountByClass[cls.name] || 0
    }))

    const isAdmin = profile?.role === 'admin'
    const isTeacher = profile?.role === 'teacher'
    const isTeacherOrAdmin = isTeacher || isAdmin

    // 自分が担任のクラス
    const myClasses = allClasses?.filter(cls => cls.teacher_id === user?.id) || []
    // その他のクラス
    const otherClasses = allClasses?.filter(cls => cls.teacher_id !== user?.id) || []

    const ClassCard = ({ cls, isMyClass = false, showAdminBadge = false }) => (
        <Link href={`/classes/${cls.id}`} className={`${styles.card} ${isMyClass ? styles.myClassCard : ''} ${showAdminBadge ? styles.adminCard : ''}`}>
            {isMyClass && <div className={styles.myClassBadge}>担任</div>}
            {showAdminBadge && !isMyClass && <div className={styles.adminBadge}>管理</div>}
            <div className={styles.cardHeader}>
                <span className={styles.cardBadge}>{cls.grade_level || '未設定'}</span>
                <span className={styles.year}>{cls.academic_year}年度</span>
            </div>
            <h3 className={styles.cardTitle}>{cls.name}</h3>
            <p className={styles.cardDescription}>
                {cls.description || '説明なし'}
            </p>
            {cls.course && (
                <div className={styles.cardCourse}>
                    <span>コース:</span> {cls.course.title}
                </div>
            )}
            <div className={styles.cardFooter}>
                <div className={styles.teacher}>
                    <div className={styles.teacherAvatar}>
                        {cls.teacher?.avatar_url ? (
                            <img src={cls.teacher.avatar_url} alt="" />
                        ) : (
                            cls.teacher?.full_name?.[0] || '?'
                        )}
                    </div>
                    <span>{cls.teacher?.full_name || '担任未設定'}</span>
                </div>
                <span className={styles.memberCount}>
                    {cls.studentCount}名
                </span>
            </div>
        </Link>
    )

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>クラス</h1>
                    <p className={styles.subtitle}>
                        {isAdmin ? '管理者として全クラスを管理できます' :
                            isTeacher ? 'クラスを管理・作成できます' : '所属クラス一覧'}
                    </p>
                </div>
                {isTeacherOrAdmin && (
                    <Link href="/classes/new" className={styles.createBtn}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 4v12M4 10h12" />
                        </svg>
                        新規クラス作成
                    </Link>
                )}
            </header>

            {error && (
                <div className={styles.error}>
                    クラスの取得に失敗しました
                </div>
            )}

            {/* 管理者の場合：全クラスを表示 */}
            {isAdmin && (
                <section className={styles.adminSection}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 2l2 4 4.5.5-3.3 3.2.8 4.3-4-2-4 2 .8-4.3L3.5 6.5 8 6z" />
                        </svg>
                        全クラス ({allClasses?.length || 0})
                    </h2>
                    <div className={styles.grid}>
                        {allClasses?.map(cls => (
                            <ClassCard
                                key={cls.id}
                                cls={cls}
                                isMyClass={cls.teacher_id === user?.id}
                                showAdminBadge={true}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* 教師の場合：担任クラスとその他を分けて表示 */}
            {isTeacher && (
                <>
                    {/* 自分のクラス */}
                    {myClasses.length > 0 && (
                        <section className={styles.myClassesSection}>
                            <h2 className={styles.sectionTitle}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M10 12l-3-3m0 0l3-3m-3 3h6" />
                                    <circle cx="10" cy="10" r="8" />
                                </svg>
                                担任クラス ({myClasses.length})
                            </h2>
                            <div className={styles.grid}>
                                {myClasses.map(cls => (
                                    <ClassCard key={cls.id} cls={cls} isMyClass={true} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* その他のクラス */}
                    {otherClasses.length > 0 && (
                        <section className={styles.otherClassesSection}>
                            {myClasses.length > 0 && (
                                <h2 className={styles.sectionTitle}>その他のクラス ({otherClasses.length})</h2>
                            )}
                            <div className={styles.grid}>
                                {otherClasses.map(cls => (
                                    <ClassCard key={cls.id} cls={cls} />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* 学生の場合 */}
            {!isTeacherOrAdmin && allClasses?.length > 0 && (
                <div className={styles.grid}>
                    {allClasses.map(cls => (
                        <ClassCard key={cls.id} cls={cls} />
                    ))}
                </div>
            )}

            {/* クラスがない場合 */}
            {allClasses?.length === 0 && (
                <div className={styles.empty}>
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                        <rect x="8" y="12" width="48" height="40" rx="4" />
                        <path d="M8 24h48" />
                        <circle cx="32" cy="36" r="8" />
                    </svg>
                    <p>クラスがありません</p>
                    {isTeacherOrAdmin && (
                        <Link href="/classes/new" className={styles.emptyBtn}>
                            最初のクラスを作成
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
