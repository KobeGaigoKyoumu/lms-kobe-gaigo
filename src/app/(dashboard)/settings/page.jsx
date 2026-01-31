import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import ProfileForm from './ProfileForm'
import MessengerConnect from '@/components/messenger/MessengerConnect'
import { getMessengerStatus, getPageId } from '@/actions/messenger'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // プロファイル取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

    // Messenger連携状態取得
    const messengerStatus = await getMessengerStatus()
    const pageId = await getPageId()

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>設定</h1>
                <p className={styles.subtitle}>プロファイルとアカウント設定</p>
            </header>

            <div className={styles.content}>
                {/* Messenger連携 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>通知設定</h2>
                    <MessengerConnect initialStatus={messengerStatus} pageId={pageId} />
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
