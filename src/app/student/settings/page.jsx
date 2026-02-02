import { redirect } from 'next/navigation'
import { getStudentSession } from '@/app/actions/studentAuth'
import styles from '@/app/(dashboard)/settings/page.module.css'
import TelegramConnect from '@/components/telegram/TelegramConnect'
import { getTelegramStatus, getBotUsername } from '@/actions/telegram'

export default async function StudentSettingsPage() {
    const session = await getStudentSession()

    if (!session) {
        redirect('/login')
    }

    // Telegram連携状態取得
    const telegramStatus = await getTelegramStatus(session)
    const botUsername = await getBotUsername()

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>設定</h1>
                <p className={styles.subtitle}>通知設定とアカウント情報</p>
            </header>

            <div className={styles.content}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>通知設定</h2>
                    <TelegramConnect initialStatus={telegramStatus} botUsername={botUsername} />
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>登録情報</h2>
                    <div className={styles.infoCard}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>名前</span>
                            <span className={styles.infoValue}>{session.name}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>クラス</span>
                            <span className={styles.infoValue}>{session.className}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>学籍番号</span>
                            <span className={styles.infoValue}>{session.studentId}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>ログイン日時</span>
                            <span className={styles.infoValue}>
                                {new Date(session.loggedInAt).toLocaleString('ja-JP')}
                            </span>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.notice} style={{ marginTop: '1rem' }}>
                        <p>※ 登録情報の変更は教務課までご連絡ください。</p>
                    </div>
                </section>
            </div>
        </div>
    )
}
