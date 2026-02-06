import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getStudentSession } from '@/app/actions/studentAuth'
import styles from './page.module.css'

// Helper to create admin client for server-side fetching
const createAdminClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

export default async function StudentGradesPage() {
    const session = await getStudentSession()

    if (!session) {
        redirect('/login')
    }

    const supabase = createAdminClient()

    // Fetch student's grade records directly using the studentId from session
    const { data: gradeRecords, error } = await supabase
        .from('grade_records')
        .select('*')
        .eq('student_id_text', session.studentId)
        .order('year_term', { ascending: false })

    if (error) {
        console.error('Error fetching grades:', error)
    }

    // Get latest record for summary
    const latestRecord = gradeRecords?.[0]

    // Calculate grade (A-F)
    const calculateGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 60) return 'B'
        if (score >= 40) return 'C'
        if (score >= 20) return 'D'
        return 'F'
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>成績確認</h1>
                <p className={styles.subtitle}>あなたの成績データ</p>
            </header>

            {/* Latest Grade Summary */}
            {latestRecord && (
                <div className={styles.summary}>
                    <div className={styles.summaryCard}>
                        <span className={styles.label}>最新学期</span>
                        <span className={styles.value}>{latestRecord.year_term}</span>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.label}>期末試験</span>
                        <span className={styles.value}>{latestRecord.final_exam_total}/600</span>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.label}>成績評価</span>
                        <span className={styles.value}>{latestRecord.report_card_total}</span>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.label}>評価</span>
                        <div className={styles.centeredContent}>
                            <span className={`${styles.value} ${styles.grade}`}>
                                {calculateGrade(latestRecord.report_card_total)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Grade History */}
            <div className={styles.historySection}>
                <h2>成績履歴</h2>
                {!gradeRecords || gradeRecords.length === 0 ? (
                    <div className={styles.empty}>
                        <p>成績データがまだ登録されていません</p>
                    </div>
                ) : (
                    <div className={styles.table}>
                        <table>
                            <thead>
                                <tr>
                                    <th>学期</th>
                                    <th>クラス</th>
                                    <th>期末試験(600)</th>
                                    <th>成績評価(100)</th>
                                    <th>評価</th>
                                    <th>登録日</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gradeRecords.map((record) => (
                                    <tr key={record.id}>
                                        <td data-label="学期">{record.year_term}</td>
                                        <td data-label="クラス">{record.class_name}</td>
                                        <td data-label="期末試験" className={styles.examScore}>{record.final_exam_total}</td>
                                        <td data-label="成績評価" className={styles.reportScore}>{record.report_card_total}</td>
                                        <td data-label="評価">
                                            <span className={`${styles.gradeBadge} ${styles[`grade${calculateGrade(record.report_card_total)}`]}`}>
                                                {calculateGrade(record.report_card_total)}
                                            </span>
                                        </td>
                                        <td data-label="登録日" className={styles.date}>
                                            {new Date(record.created_at).toLocaleDateString('ja-JP')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Subject Details (if latest record exists) */}
            {latestRecord?.report_card_data && (
                <div className={styles.subjectSection}>
                    <h2>科目別詳細 ({latestRecord.year_term})</h2>
                    <div className={styles.subjectGrid}>
                        {Object.entries(latestRecord.report_card_data)
                            .filter(([subject, data]) =>
                                subject !== 'attendance' &&
                                subject !== 'participation' &&
                                subject !== 'overall' &&
                                typeof data === 'object'
                            )
                            .map(([subject, data]) => (
                                <div key={subject} className={styles.subjectCard}>
                                    <h3>{subject === 'vocab' ? '語彙' :
                                        subject === 'listening' ? '聴解' :
                                            subject === 'reading' ? '読解' :
                                                subject === 'grammar' ? '文法' :
                                                    subject === 'writing' ? '作文' :
                                                        subject === 'conversation' ? '会話' : subject}
                                    </h3>
                                    <div className={styles.subjectScores}>
                                        <div className={styles.scoreItem}>
                                            <span className={styles.scoreLabel}>期末試験</span>
                                            <span className={styles.scoreValue}>
                                                {subject === 'overall'
                                                    ? latestRecord.final_exam_total
                                                    : (latestRecord.final_exam_data?.[subject] || 0)}
                                            </span>
                                        </div>
                                        <div className={`${styles.scoreItem} ${styles.total}`}>
                                            <span className={styles.scoreLabel}>評価点</span>
                                            <span className={styles.scoreValue}>
                                                <span className={`${styles.gradeBadge} ${styles.miniBadge} ${styles[`grade${calculateGrade(data.total)}`]}`}>
                                                    {calculateGrade(data.total)}
                                                </span>
                                                {data.total?.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    )
}
