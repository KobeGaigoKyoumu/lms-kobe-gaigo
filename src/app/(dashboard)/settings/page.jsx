import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import ProfileForm from './ProfileForm'
import NotificationDebug from './NotificationDebug'
import TelegramConnect from '@/components/telegram/TelegramConnect'
import { getTelegramStatus, getBotUsername } from '@/actions/telegram'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // プロファイル取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

        .eq('id', user?.id)
        .single()

    // Telegram連携状態取得
    const telegramStatus = await getTelegramStatus()
    const botUsername = await getBotUsername()

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>設定</h1>
                <p className={styles.subtitle}>プロファイルとアカウント設定</p>
            </header>

            <div className={styles.content}>
                {/* Telegram連携 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>通知設定</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <TelegramConnect initialStatus={telegramStatus} botUsername={botUsername} />
                    </div>
                </section>

                {/* 通知デバッグ（診断ツール） */}
                <section className={styles.section}>
                    <NotificationDebug />
                </section>

                {/* プロファイルセクション */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>プロファイル</h2>
                    <ProfileForm profile={profile} user={user} />
                </section>

                {/* アカウント情報 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>アカウント情報</h2>
                    <div className={styles.infoCard}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>メールアドレス</span>
                            <span className={styles.infoValue}>{user?.email}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>ロール</span>
                            <span className={`${styles.badge} ${styles[profile?.role || 'student']}`}>
                                {profile?.role === 'admin' ? '管理者' :
                                    profile?.role === 'teacher' ? '教師' : '学生'}
                            </span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>登録日</span>
                            <span className={styles.infoValue}>
                                {new Date(user?.created_at).toLocaleDateString('ja-JP')}
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
