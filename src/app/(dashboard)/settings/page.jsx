import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import ProfileForm from './ProfileForm'
import NotificationDebug from './NotificationDebug'
import StorageUsage from './StorageUsage'
import TelegramConnect from '@/components/telegram/TelegramConnect'
import { getTelegramStatus, getBotUsername } from '@/actions/telegram'
import { getImageKitUsage, getSupabaseStorageUsage } from '@/app/actions/storageUsage'
import { getAdminMembers } from '@/app/actions/adminAuth'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // プロファイル取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

    // Telegram連携状態取得
    const telegramStatus = await getTelegramStatus()
    const botUsername = await getBotUsername()

    // ストレージ使用量取得
    const [imageKitUsage, supabaseUsage] = await Promise.all([
        getImageKitUsage(),
        getSupabaseStorageUsage()
    ])

    // 管理者メンバーのパスワード一覧（admin + Google認証の場合のみ取得）
    const isGoogleAdmin = user && profile?.role === 'admin'
    const adminMembers = isGoogleAdmin ? await getAdminMembers() : []

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>設定</h1>
                <p className={styles.subtitle}>プロファイルとアカウント設定</p>
            </header>

            <div className={styles.content}>
                {/* ストレージ使用量セクション */}
                {profile?.role === 'admin' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>ストレージ使用状況</h2>
                        <StorageUsage imageKit={imageKitUsage} supabase={supabaseUsage} />
                    </section>
                )}

                {/* 管理者メンバーパスワード一覧（Google認証のadminのみ） */}
                {isGoogleAdmin && adminMembers.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>教職員メンバー パスワード一覧</h2>
                        <div className={styles.infoCard}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)' }}>名前</th>
                                        <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)' }}>パスワード</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adminMembers.map((m, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{m.name}</td>
                                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', letterSpacing: '0.15em', color: 'var(--primary-600)' }}>{m.password}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Telegram連携 */}
                {profile?.role === 'student' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Telegram 通知設定</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <TelegramConnect initialStatus={telegramStatus} botUsername={botUsername} />
                        </div>
                    </section>
                )}

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
