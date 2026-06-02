'use client'

import { useState } from 'react'
import styles from './page.module.css'

export default function AttendanceGradesClient({ attendanceRecords, gradeRecords }) {
    const [activeTab, setActiveTab] = useState('attendance') // 'attendance' or 'grades'

    // ==========================================
    // Attendance Logic
    // ==========================================
    const cumulativeRecords = attendanceRecords?.filter(r => r.is_cumulative) || []
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
    const groupedAttendanceRecords = {}
    attendanceRecords?.forEach(record => {
        const key = `${record.year}-${String(record.month).padStart(2, '0')}`
        if (!groupedAttendanceRecords[key]) {
            groupedAttendanceRecords[key] = { monthly: null, cumulative: null }
        }
        if (record.is_cumulative) {
            groupedAttendanceRecords[key].cumulative = record
        } else {
            groupedAttendanceRecords[key].monthly = record
        }
    })

    // ==========================================
    // Grades Logic
    // ==========================================
    const latestGradeRecord = gradeRecords?.[0]

    const calculateGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 60) return 'B'
        if (score >= 40) return 'C'
        if (score >= 20) return 'D'
        return 'F'
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>出席率・成績</h1>

            {/* Tab Navigation */}
            <div className={styles.tabContainer}>
                <button
                    onClick={() => setActiveTab('attendance')}
                    className={`${styles.tabButton} ${activeTab === 'attendance' ? styles.tabButtonActive : ''}`}
                >
                    出席状況
                </button>
                <button
                    onClick={() => setActiveTab('grades')}
                    className={`${styles.tabButton} ${activeTab === 'grades' ? styles.tabButtonActive : ''}`}
                >
                    成績確認
                </button>
            </div>

            {/* ==========================================
                Attendance Tab Content
               ========================================== */}
            {activeTab === 'attendance' && (
                <div>
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
                        {Object.keys(groupedAttendanceRecords).length === 0 ? (
                            <p className={styles.empty}>出席データがありません。</p>
                        ) : (
                            <div className={styles.table}>
                                <table>
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
                                        {Object.entries(groupedAttendanceRecords)
                                            .sort(([keyA], [keyB]) => keyB.localeCompare(keyA)) // Sort by YYYY-MM desc
                                            .map(([key, data]) => {
                                                const { monthly, cumulative } = data
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
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==========================================
                Grades Tab Content
               ========================================== */}
            {activeTab === 'grades' && (
                <div>
                    {/* Latest Grade Summary */}
                    {latestGradeRecord && (
                        <div className={styles.summary}>
                            <div className={styles.summaryCard}>
                                <span className={styles.label}>最新学期</span>
                                <span className={styles.value}>{latestGradeRecord.year_term}</span>
                            </div>
                            <div className={styles.summaryCard}>
                                <span className={styles.label}>期末試験</span>
                                <span className={styles.value}>{latestGradeRecord.final_exam_total}/600</span>
                            </div>
                            <div className={styles.summaryCard}>
                                <span className={styles.label}>成績評価</span>
                                <span className={styles.value}>{latestGradeRecord.report_card_total}</span>
                            </div>
                            <div className={styles.summaryCard}>
                                <span className={styles.label}>評価</span>
                                <div className={styles.centeredContent}>
                                    <span className={`${styles.value} ${styles.grade}`}>
                                        {calculateGrade(latestGradeRecord.report_card_total)}
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
                    {latestGradeRecord?.report_card_data && (
                        <div className={styles.subjectSection}>
                            <h2>科目別詳細 ({latestGradeRecord.year_term})</h2>
                            <div className={styles.subjectGrid}>
                                {Object.entries(latestGradeRecord.report_card_data)
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
                                            {(() => {
                                                const subjectExamScore = latestGradeRecord.final_exam_data?.[subject] || 0;
                                                return (
                                                    <div className={styles.subjectScores}>
                                                        <div className={styles.scoreItem}>
                                                            <span className={styles.scoreLabel}>期末試験</span>
                                                            <span className={styles.scoreValue}>
                                                                <span className={`${styles.gradeBadge} ${styles.miniBadge} ${styles[`grade${calculateGrade(subjectExamScore)}`]}`}>
                                                                    {calculateGrade(subjectExamScore)}
                                                                </span>
                                                                {subjectExamScore}
                                                            </span>
                                                        </div>
                                                        <div className={`${styles.scoreItem} ${styles.total}`}>
                                                            <span className={styles.scoreLabel}>成績評価</span>
                                                            <span className={styles.scoreValue}>
                                                                <span className={`${styles.gradeBadge} ${styles.miniBadge} ${styles[`grade${calculateGrade(data.total)}`]}`}>
                                                                    {calculateGrade(data.total)}
                                                                </span>
                                                                {data.total?.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
