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

    // Group records by Year-Month
    const groupedRecords = {}

    records?.forEach(record => {
        const key = `${record.year}-${String(record.month).padStart(2, '0')}`
        if (!groupedRecords[key]) {
            groupedRecords[key] = { monthly: null, cumulative: null }
        }

        if (record.is_cumulative) {
            groupedRecords[key].cumulative = record
        } else {
            groupedRecords[key].monthly = record
        }
    })

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

            {/* Combined Attendance History */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>出欠履歴</h2>
                {Object.keys(groupedRecords).length === 0 ? (
                    <p className={styles.empty}>出席データがありません。</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>年月</th>
                                <th>月間出席率</th>
                                <th>累積出席率</th>
                                <th>授業日数</th>
                                <th>出席日数</th>
                                <th>欠席日数</th>
                                <th>遅刻・早退</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedRecords)
                                .sort(([keyA], [keyB]) => keyB.localeCompare(keyA)) // Sort by YYYY-MM desc
                                .map(([key, data]) => {
                                    const { monthly, cumulative } = data
                                    // Use monthly record for detailed counts, or fallback if only cumulative exists (unlikely structure but safe)
                                    const baseRecord = monthly || cumulative
                                    const totalDays = baseRecord ? (baseRecord.attendance_days || 0) + (baseRecord.absence_days || 0) : 0

                                    return (
                                        <tr key={key}>
                                            <td data-label="年月">{baseRecord.year}年 {baseRecord.month}月</td>
                                            <td data-label="月間出席率">
                                                {monthly ? (
                                                    <span className={getRateColor(monthly.attendance_rate)}>
                                                        {formatRate(monthly.attendance_rate)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td data-label="累積出席率">
                                                {cumulative ? (
                                                    <span className={getRateColor(cumulative.attendance_rate)}>
                                                        {formatRate(cumulative.attendance_rate)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td data-label="授業日数">{monthly ? totalDays : '-'}</td>
                                            <td data-label="出席日数">{monthly?.attendance_days ?? '-'}</td>
                                            <td data-label="欠席日数">{monthly?.absence_days ?? '-'}</td>
                                            <td data-label="遅刻・早退">{monthly?.late_slots ?? '-'}</td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
