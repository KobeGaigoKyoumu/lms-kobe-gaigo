import { getStudentSession } from '@/app/actions/studentAuth'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function StudentAttendancePage() {
    // 1. Check Student Session
    const session = await getStudentSession()
    if (!session) {
        redirect('/login')
    }

    const { studentId } = session

    // 2. Create Admin Client (Service Role) to bypass RLS for reading attendance
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase Service Key')
        return <div className={styles.page}><p className={styles.empty}>システムエラー: 設定を確認してください。</p></div>
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Fetch Attendance Records
    const { data: records, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

    if (error) {
        console.error('Fetch attendance error:', error)
        return <div className={styles.page}><p className={styles.empty}>データの取得に失敗しました。</p></div>
    }

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
                            {monthlyRecords.map(record => {
                                // Calculate total days if derived, or use columns if they exist.
                                // Based on import script: attendance_days, absence_days, late_slots
                                const totalDays = (record.attendance_days || 0) + (record.absence_days || 0)
                                return (
                                    <tr key={`${record.year}-${record.month}`}>
                                        <td data-label="年月">{record.year}年 {record.month}月</td>
                                        <td data-label="出席率" className={getRateColor(record.attendance_rate)}>
                                            {formatRate(record.attendance_rate)}
                                        </td>
                                        <td data-label="授業日数">{totalDays || '-'}</td>
                                        <td data-label="出席日数">{record.attendance_days || '-'}</td>
                                        <td data-label="欠席日数">{record.absence_days || '-'}</td>
                                        <td data-label="遅刻・早退">{record.late_slots || '-'}</td>
                                    </tr>
                                )
                            })}
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
                                    <td data-label="年月">{record.year}年 {record.month}月</td>
                                    <td data-label="累積出席率" className={getRateColor(record.attendance_rate)}>
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
