import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'ユーザー'

    return (
        <div className={styles.page}>
            {/* ヘッダー */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>おかえりなさい、{firstName}さん</h1>
                    <p className={styles.subtitle}>今日も頑張りましょう！</p>
                </div>
                <div className={styles.date}>
                    {new Date().toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                    })}
                </div>
            </header>

            {/* 統計カード */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M4 6h16M4 12h16M4 18h8" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>登録コース</p>
                        <p className={styles.statValue}>0</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>未提出課題</p>
                        <p className={styles.statValue}>0</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>完了課題</p>
                        <p className={styles.statValue}>0</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>今週の予定</p>
                        <p className={styles.statValue}>0</p>
                    </div>
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className={styles.mainGrid}>
                {/* 最近の課題 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <rect x="7" y="2" width="6" height="4" rx="1" />
                        </svg>
                        最近の課題
                    </h2>
                    <div className={styles.emptyState}>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                            <path d="M18 10H14a4 4 0 0 0-4 4v24a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4V14a4 4 0 0 0-4-4h-4" />
                            <rect x="16" y="4" width="16" height="8" rx="2" />
                        </svg>
                        <p>課題がありません</p>
                    </div>
                </section>

                {/* お知らせ */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M15 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M3 6l7-4 7 4" />
                            <path d="M10 10v4" />
                        </svg>
                        お知らせ
                    </h2>
                    <div className={styles.emptyState}>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                            <path d="M36 14v18a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V14" />
                            <path d="M8 14l16-10 16 10" />
                            <path d="M24 22v10" />
                        </svg>
                        <p>お知らせはありません</p>
                    </div>
                </section>
            </div>
        </div>
    )
}
