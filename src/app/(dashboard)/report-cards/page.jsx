import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import GradeUploader from './GradeUploader'
import GradeHistoryBoard from './GradeHistoryBoard'
import Link from 'next/link'

export default async function ReportCardsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 現在のユーザーのプロファイル取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div>
                        <h1 className={styles.title}>成績</h1>
                        <p className={styles.subtitle}>
                            成績評価シートをアップロードして学生の成績を管理します
                        </p>
                    </div>
                    {isTeacherOrAdmin && (
                        <div className={styles.headerActions}>
                            <Link href="/report-cards/analytics" className={styles.analyticsBtn}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 20V10" />
                                    <path d="M12 20V4" />
                                    <path d="M6 20V14" />
                                </svg>
                                統計・分析を表示
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {isTeacherOrAdmin ? (
                <>
                    <GradeUploader />
                    <div style={{ marginTop: '40px', borderTop: '1px solid #e5e7eb', paddingTop: '40px' }}>
                        <GradeHistoryBoard />
                    </div>
                </>
            ) : (
                <div className={styles.studentView}>
                    <p>成績の閲覧権限がありません。担当教師にお問い合わせください。</p>
                </div>
            )}
        </div>
    )
}

