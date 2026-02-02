import { redirect } from 'next/navigation'
import { getStudentSession } from '@/app/actions/studentAuth'
import styles from '@/app/(dashboard)/settings/page.module.css'
import TelegramConnect from '@/components/telegram/TelegramConnect'
import { getTelegramStatus, getBotUsername } from '@/actions/telegram'
import { getStudentJlptHistory } from '@/actions/studentJlpt'

export default async function StudentSettingsPage() {
    const session = await getStudentSession()

    if (!session) {
        redirect('/login')
    }

    // Telegram連携状態取得
    const telegramStatus = await getTelegramStatus(session)
    const botUsername = await getBotUsername()

    // JLPT履歴取得
    const jlptHistory = await getStudentJlptHistory(session.studentId)

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
                    <h2 className={styles.sectionTitle}>JLPT受験履歴</h2>
                    {jlptHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                        <th style={{ padding: '8px' }}>実施回</th>
                                        <th style={{ padding: '8px' }}>レベル</th>
                                        <th style={{ padding: '8px' }}>合否</th>
                                        <th style={{ padding: '8px' }}>総合得点</th>
                                        <th style={{ padding: '8px' }}>言語知識</th>
                                        <th style={{ padding: '8px' }}>読解</th>
                                        <th style={{ padding: '8px' }}>聴解</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jlptHistory.map((record, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '8px' }}>{record.session}</td>
                                            <td style={{ padding: '8px' }}>{record.level}</td>
                                            <td style={{ padding: '8px' }}>
                                                <span style={{
                                                    color: record.result === '合格' ? '#10b981' : '#ef4444',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {record.result}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px', fontWeight: 'bold' }}>{record.score}</td>
                                            <td style={{ padding: '8px' }}>
                                                {record.sectionScores?.knowledge || '-'}
                                                {['N4', 'N5'].includes(record.level) && <span style={{ fontSize: '0.8em', color: '#666' }}> (読解含)</span>}
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                {record.sectionScores?.reading || '-'}
                                            </td>
                                            <td style={{ padding: '8px' }}>{record.sectionScores?.listening || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ color: '#666', padding: '1rem' }}>受験履歴が見つかりませんでした。</p>
                    )}
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
