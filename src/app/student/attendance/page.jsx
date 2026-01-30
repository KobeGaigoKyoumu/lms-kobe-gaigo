import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function StudentAttendancePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, student_id_text')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'student') {
        redirect('/')
    }

    if (!profile?.student_id_text) {
        return (
            <div className={styles.page}>
                <div className={styles.section}>
                    <p className={styles.empty}>学籍番号が登録されていません。</p>
                </div>
            </div>
        )
    }

    const studentId = profile.student_id_text

    // Fetch Attendance Records
    const { data: records } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

    const cumulativeRecords = records?.filter(r => r.is_cumulative) || []
    const monthlyRecords = records?.filter(r => !r.is_cumulative) || []

    const latestCumulative = cumulativeRecords[0]
    const latestRate = latestCumulative?.attendance_rate || 0

    const getRateColor = (rate) => {
        if (rate >= 0.95) return styles.rateExcellent
        if (rate >= 0.90) return styles.rateGood
        if (rate >= 0.80) return styles.rateWarning
        return styles.rateDanger
    }

    const formatRate = (rate) => (rate * 100).toFixed(1) + '%'

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>出席状況</h1>

            {/* Overview Card */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>現在の累積出席率</div>
                    <div className={`${styles.statValue} ${getRateColor(latestRate)}`}>
                        {formatRate(latestRate)}
                    </div>
                </div>
                {/* Add more stats if needed, e.g. "Days Present", "Days Absent" if available in schema */}
            </div>

            {/* Monthly History */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>月別履歴</h2>
                {monthlyRecords.length === 0 ? (
                    <p className={styles.empty}>出席データがありません。</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>年月</th>
                                <th>出席率</th>
                                <th>授業日数</th>
                                <th>出席日数</th>
                                <th>欠席日数</th>
                                <th>遅刻・早退</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyRecords.map(record => (
                                <tr key={`${record.year}-${record.month}`}>
                                    <td>{record.year}年 {record.month}月</td>
                                    <td className={getRateColor(record.attendance_rate)}>
                                        {formatRate(record.attendance_rate)}
                                    </td>
                                    <td>{record.days_total || '-'}</td>
                                    <td>{record.days_attended || '-'}</td>
                                    <td>{record.days_absent || '-'}</td>
                                    <td>{record.days_late || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Cumulative History Log */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>累積履歴</h2>
                {cumulativeRecords.length === 0 ? (
                    <p className={styles.empty}>累積データがありません。</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>年月</th>
                                <th>累積出席率</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cumulativeRecords.map(record => (
                                <tr key={`${record.year}-${record.month}`}>
                                    <td>{record.year}年 {record.month}月</td>
                                    <td className={getRateColor(record.attendance_rate)}>
                                        {formatRate(record.attendance_rate)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
