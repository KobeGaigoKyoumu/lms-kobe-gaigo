import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'

export default async function ClassesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 現在のユーザーのプロファイル取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'

    // クラス一覧取得
    const { data: classes, error } = await supabase
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
            ),
            members:class_members (count)
        `)
        .order('created_at', { ascending: false })

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>クラス</h1>
                    <p className={styles.subtitle}>
                        {isTeacherOrAdmin ? 'クラスを管理・作成できます' : '所属クラス一覧'}
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

            <div className={styles.grid}>
                {classes?.length === 0 && (
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

                {classes?.map(cls => (
                    <Link href={`/classes/${cls.id}`} key={cls.id} className={styles.card}>
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
                                <span>{cls.teacher?.full_name || '担当者未設定'}</span>
                            </div>
                            <span className={styles.memberCount}>
                                {cls.members?.[0]?.count || 0}名
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
