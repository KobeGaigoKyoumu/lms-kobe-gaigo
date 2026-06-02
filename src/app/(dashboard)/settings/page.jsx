import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import ProfileForm from './ProfileForm'
import NotificationDebug from './NotificationDebug'
import StorageUsage from './StorageUsage'
import TelegramConnect from '@/components/telegram/TelegramConnect'
import { getTelegramStatus, getBotUsername } from '@/actions/telegram'
import { getImageKitUsage, getSupabaseStorageUsage, getCloudinaryUsage } from '@/app/actions/storageUsage'
import { getAdminMembers, getAdminMemberSession } from '@/app/actions/adminAuth'
import QRCodeDisplay from './QRCodeDisplay'

export default async function SettingsPage() {
    const adminMember = await getAdminMemberSession()
    const supabase = await createClient()

    // Get Google Auth user only if not an admin member or if needed for profile
    const { data: { user } } = await supabase.auth.getUser()

    // プロファイル取得
    let profile = null
    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        profile = data
    }

    // Determine roles and flags
    const isGoogleUser = !!user
    const isAdmin = (adminMember?.role === 'admin') || (isGoogleUser && profile?.role === 'admin')
    const isTeacher = (adminMember?.role === 'teacher') || (isGoogleUser && profile?.role === 'teacher')
    
    const displayRole = adminMember ? adminMember.role : (profile?.role || 'student')
    const displayEmail = isGoogleUser ? user.email : (adminMember ? `${adminMember.name}@member` : '')
    const displayName = adminMember ? adminMember.name : (user?.user_metadata?.full_name || '')
    const displayCreatedAt = isGoogleUser ? user.created_at : null

    // Telegram連携状態取得（学生の場合のみ）
    let telegramStatus = null
    let botUsername = null
    if (isGoogleUser && profile?.role === 'student') {
        telegramStatus = await getTelegramStatus()
        botUsername = await getBotUsername()
    }

    // ストレージ使用量取得（管理者のみ）
    let imageKitUsage = null
    let supabaseUsage = null
    let cloudinaryUsage = null
    if (isAdmin) {
        ;[imageKitUsage, supabaseUsage, cloudinaryUsage] = await Promise.all([
            getImageKitUsage(),
            getSupabaseStorageUsage(),
            getCloudinaryUsage()
        ])
    }

    // 管理者メンバーのパスワード一覧（管理者の場合。Service Roleを使用するため、admin_memberであれば閲覧可能にする）
    const adminMembers = isAdmin ? await getAdminMembers() : []

    const roleLabel = displayRole === 'admin' ? '管理者' : displayRole === 'teacher' ? '教師' : '学生'
    const roleBadgeClass = displayRole === 'admin' ? 'admin' : displayRole === 'teacher' ? 'teacher' : 'student'

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>設定</h1>
                <p className={styles.subtitle}>プロファイルとアカウント設定</p>
            </header>

            <div className={styles.content}>
                {/* ストレージ使用量セクション */}
                {isAdmin && imageKitUsage && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>ストレージ使用状況</h2>
                        <StorageUsage imageKit={imageKitUsage} supabase={supabaseUsage} cloudinary={cloudinaryUsage} />
                    </section>
                )}

                {/* 管理者メンバーパスワード一覧（Google認証のadminのみ） */}
                {isAdmin && adminMembers.length > 0 && (
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
                {isGoogleUser && profile?.role === 'student' && (
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

                {/* プロファイルセクション（Google認証のみ） */}
                {isGoogleUser && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>プロファイル</h2>
                        <ProfileForm profile={profile} user={user} />
                    </section>
                )}

                {/* アカウント情報 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>アカウント情報</h2>
                    <div className={styles.infoCard}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>{isGoogleUser ? 'メールアドレス' : '名前'}</span>
                            <span className={styles.infoValue}>{isGoogleUser ? displayEmail : displayName}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>ロール</span>
                            <span className={`${styles.badge} ${styles[roleBadgeClass]}`}>
                                {roleLabel}
                            </span>
                        </div>
                        {displayCreatedAt && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>登録日</span>
                                <span className={styles.infoValue}>
                                    {new Date(displayCreatedAt).toLocaleDateString('ja-JP')}
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {/* WebアプリインストールQR (Admin & Teacher向け) */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>システム (Webアプリ) のインストール</h2>
                    <QRCodeDisplay />
                </section>
            </div>
        </div>
    )
}

