import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getStudentSession } from '@/app/actions/studentAuth'
import { getStudentJlptHistory } from '@/actions/studentJlpt'
import styles from './page.module.css'

// Helper to create admin client for server-side fetching
const createAdminClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

export default async function StudentProfilePage() {
    const session = await getStudentSession()

    if (!session) {
        redirect('/login')
    }

    const supabase = createAdminClient()

    // Fetch student's full profile data
    const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', session.studentId)
        .single()

    if (error || !student) {
        console.error('Error fetching student profile:', error)
        // Fallback or error state could be handled here
    }

    // JLPT履歴取得
    const jlptHistory = await getStudentJlptHistory(session.studentId, session.name)

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return <span className={styles.empty}>未登録</span>
        try {
            return new Date(dateString).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        } catch (e) {
            return dateString
        }
    }

    // Helper for null/empty values
    const displayValue = (value) => {
        return value || <span className={styles.empty}>未登録</span>
    }

    // Helper to calculate A/B/C grade from score (e.g. "30/60")
    const calculateGrade = (scoreStr) => {
        if (!scoreStr || !scoreStr.includes('/')) return null
        const score = parseInt(scoreStr.split('/')[0])
        if (isNaN(score)) return null

        // Logic: A=40-60, B=20-39, C=0-19
        if (score >= 40) return 'A'
        if (score >= 20) return 'B'
        return 'C'
    }

    // Helper for grade colors
    const getGradeColor = (grade) => {
        switch (grade) {
            case 'A': return '#10b981' // Green
            case 'B': return '#f59e0b' // Amber/Orange
            case 'C': return '#ef4444' // Red
            default: return '#6b7280' // Gray
        }
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>プロフィール</h1>
                <p className={styles.subtitle}>学生個人情報</p>
            </header>

            <div className={styles.content}>
                {/* 基本情報 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>基本情報</h2>
                    <div className={styles.grid}>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>氏名</span>
                            <span className={styles.value}>{displayValue(student?.full_name)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>フリガナ</span>
                            <span className={styles.value}>{displayValue(student?.name_kana)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>ローマ字</span>
                            <span className={styles.value}>{displayValue(student?.name_romaji)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>学籍番号</span>
                            <span className={styles.value}>{displayValue(student?.student_id_text)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>クラス</span>
                            <span className={styles.value}>{displayValue(student?.class_name)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>コース</span>
                            <span className={styles.value}>{displayValue(student?.course)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>ステータス</span>
                            <span className={styles.value}>
                                <span className={`${styles.tag} ${student?.status === 'active' ? styles.active : ''}`}>
                                    {student?.status === 'active' ? '在籍中' :
                                        student?.status === 'graduated' ? '卒業' :
                                            student?.status === 'completed' ? '修了' :
                                                student?.status === 'inactive' ? '休学' :
                                                    student?.status === 'withdrawn' ? '退学' : student?.status}
                                </span>
                            </span>
                        </div>
                    </div>
                </section>

                {/* 個人情報 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>個人情報</h2>
                    <div className={styles.grid}>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>生年月日</span>
                            <span className={styles.value}>{formatDate(student?.birth_date)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>性別</span>
                            <span className={styles.value}>{displayValue(student?.gender)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>国籍</span>
                            <span className={styles.value}>{displayValue(student?.nationality)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>住所</span>
                            <span className={styles.value}>{displayValue(student?.address)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>電話番号</span>
                            <span className={styles.value}>{displayValue(student?.phone)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>メールアドレス</span>
                            <span className={styles.value}>{displayValue(student?.email)}</span>
                        </div>
                    </div>
                </section>

                {/* ビザ・身分証明書情報 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>ビザ・身分証明書</h2>
                    <div className={styles.grid}>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>在留資格</span>
                            <span className={styles.value}>{displayValue(student?.visa_status)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>在留カード番号</span>
                            <span className={styles.value}>{displayValue(student?.residence_card_number)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>在留期限</span>
                            <span className={styles.value}>{formatDate(student?.visa_expiry)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>パスポート番号</span>
                            <span className={styles.value}>{displayValue(student?.passport_number)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>入国日</span>
                            <span className={styles.value}>{formatDate(student?.entry_date)}</span>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>入学・卒業情報</h2>
                    <div className={styles.grid}>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>入学年月日</span>
                            <span className={styles.value}>{formatDate(student?.enrollment_date)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>期</span>
                            <span className={styles.value}>{displayValue(student?.enrollment_period)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>卒業予定日</span>
                            <span className={styles.value}>{formatDate(student?.graduation_date)}</span>
                        </div>
                    </div>
                </section>

                {/* JLPT受験履歴 */}
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
                                                <div>{record.sectionScores?.knowledge || '-'}</div>
                                                {calculateGrade(record.sectionScores?.knowledge) && (
                                                    <div style={{ color: getGradeColor(calculateGrade(record.sectionScores?.knowledge)), fontSize: '0.9em', fontWeight: 'bold' }}>
                                                        評価: {calculateGrade(record.sectionScores?.knowledge)}
                                                    </div>
                                                )}
                                                {['N4', 'N5'].includes(record.level) && <span style={{ fontSize: '0.8em', color: '#666' }}>(読解含)</span>}
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <div>{record.sectionScores?.reading || '-'}</div>
                                                {calculateGrade(record.sectionScores?.reading) && (
                                                    <div style={{ color: getGradeColor(calculateGrade(record.sectionScores?.reading)), fontSize: '0.9em', fontWeight: 'bold' }}>
                                                        評価: {calculateGrade(record.sectionScores?.reading)}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <div>{record.sectionScores?.listening || '-'}</div>
                                                {calculateGrade(record.sectionScores?.listening) && (
                                                    <div style={{ color: getGradeColor(calculateGrade(record.sectionScores?.listening)), fontSize: '0.9em', fontWeight: 'bold' }}>
                                                        評価: {calculateGrade(record.sectionScores?.listening)}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ color: '#666', padding: '1rem' }}>受験履歴が見つかりませんでした。</p>
                    )}
                </section>
            </div>
        </div>
    )
}
