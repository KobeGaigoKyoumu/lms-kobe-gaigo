import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

// 24時間キャッシュ（ISR）- Removed as we use cached Server Action now
// export const revalidate = 86400

import { fetchCachedCourses } from '@/app/actions/courseData'

export default async function CoursesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    // 現在のユーザーのプロファイル取得
    let isTeacherOrAdmin = !!adminMember // Admin members are always teachers
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'
    }

    // コース一覧取得 (Cached)
    const courses = await fetchCachedCourses()
    const error = null // cached action throws if error, or returns data

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>コース</h1>
                    <p className={styles.subtitle}>
                        {isTeacherOrAdmin ? 'コースを管理・作成できます' : '登録可能なコース一覧'}
                    </p>
                </div>
                {isTeacherOrAdmin && (
                    <Link href="/courses/new" className={styles.createBtn}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 4v12M4 10h12" />
                        </svg>
                        新規コース作成
                    </Link>
                )}
            </header>

            {error && (
                <div className={styles.error}>
                    コースの取得に失敗しました
                </div>
            )}

            <div className={styles.grid}>
                {courses?.length === 0 && (
                    <div className={styles.empty}>
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                            <rect x="8" y="12" width="48" height="40" rx="4" />
                            <path d="M8 24h48" />
                            <path d="M20 12V8M44 12V8" />
                        </svg>
                        <p>コースがありません</p>
                        {isTeacherOrAdmin && (
                            <Link href="/courses/new" className={styles.emptyBtn}>
                                最初のコースを作成
                            </Link>
                        )}
                    </div>
                )}

                {courses?.map(course => (
                    <Link href={`/courses/${course.id}`} key={course.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardBadge}>
                                {course.is_published ? '公開中' : '下書き'}
                            </div>
                        </div>
                        <h3 className={styles.cardTitle}>{course.title}</h3>
                        <p className={styles.cardDescription}>
                            {course.description || '説明なし'}
                        </p>
                        <div className={styles.cardFooter}>
                            <div className={styles.teacher}>
                                <div className={styles.teacherAvatar}>
                                    {course.teacher?.avatar_url ? (
                                        <img src={course.teacher.avatar_url} alt="" />
                                    ) : (
                                        course.teacher?.full_name?.[0] || '?'
                                    )}
                                </div>
                                <span>{course.teacher?.full_name || '担当者未設定'}</span>
                            </div>
                            <span className={styles.date}>
                                {new Date(course.created_at).toLocaleDateString('ja-JP')}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
