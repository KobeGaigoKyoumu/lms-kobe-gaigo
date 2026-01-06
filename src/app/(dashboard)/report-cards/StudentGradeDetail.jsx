'use client'

import React from 'react'
import RadarChart from './RadarChart'
import styles from './page.module.css' // We can reuse the CSS or inline styles for simplicity if needed

const StudentGradeDetail = ({ student, viewMode }) => {
    // Helper used in GradeUploader
    const getGradeColor = (score) => {
        if (score >= 80) return '#166534' // Green
        if (score >= 60) return '#1e40af' // Blue
        if (score >= 40) return '#b45309' // Yellow-Orange
        if (score >= 20) return '#991b1b' // Red
        return '#7f1d1d' // Dark Red
    }

    const getGradeBg = (score) => {
        if (score >= 80) return '#dcfce7'
        if (score >= 60) return '#eff6ff'
        if (score >= 40) return '#fef3c7'
        if (score >= 20) return '#fee2e2'
        return '#fecaca'
    }

    const calculateGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 60) return 'B'
        if (score >= 40) return 'C'
        if (score >= 20) return 'D'
        return 'F'
    }

    // Calculate Final Exam Letter Grade
    const calculateFinalExamGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 60) return 'B'
        if (score >= 40) return 'C'
        if (score >= 20) return 'D'
        return 'F'
    }

    const { reportDetails, finalExam, reportCard, finalExamSum, reportCardTotal } = student

    // Handle case where reportDetails/finalExam might be missing if data integrity issue
    if (!reportDetails || !finalExam) return null;

    return (
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', marginBottom: '30px', backgroundColor: '#fff' }}>
            {/* Header: Name & Final Exam Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '15px' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {student.name} <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>({student.id})</span>
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {student.class}
                    </div>
                </div>

                <div style={{ textAlign: 'center', padding: '10px 15px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>期末試験 (合計)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {calculateFinalExamGrade(finalExamSum / 6)} <span style={{ fontSize: '1rem', color: '#6b7280' }}>({finalExamSum})</span>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className={styles.chartsGrid}>
                {viewMode === 'exam' ? (
                    <>
                        <div className={styles.chartWrapper}>
                            <h4 className={styles.chartTitle}>期末試験結果 (合計: {finalExamSum}/600)</h4>
                            <div className={styles.chartContainer}>
                                <RadarChart
                                    labels={['文字・語彙', '聴解', '読解', '文法', '作文', '会話']}
                                    data={[
                                        finalExam.vocab,
                                        finalExam.listening,
                                        finalExam.reading,
                                        finalExam.grammar,
                                        finalExam.writing,
                                        finalExam.conversation
                                    ]}
                                    title="期末試験"
                                    color="blue"
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>科目</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>点数 (100点満点)</th>
                                        <th style={{ padding: '10px', textAlign: 'center' }}>判定</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { label: '文字・語彙', val: finalExam.vocab },
                                        { label: '聴解', val: finalExam.listening },
                                        { label: '読解', val: finalExam.reading },
                                        { label: '文法', val: finalExam.grammar },
                                        { label: '作文', val: finalExam.writing },
                                        { label: '会話', val: finalExam.conversation },
                                    ].map((cat, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '12px 10px' }}>{cat.label}</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right' }}>{cat.val}</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold' }}>
                                                {calculateFinalExamGrade(cat.val)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>
                                        <td style={{ padding: '12px 10px' }}>合計</td>
                                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>{finalExamSum} / 600</td>
                                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                            {calculateFinalExamGrade(finalExamSum / 6)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.chartWrapper}>
                            <h4 className={styles.chartTitle}>成績通知表 (総合成績: {reportCardTotal})</h4>
                            <div className={styles.chartContainer}>
                                <RadarChart
                                    labels={['文字・語彙', '聴解', '読解', '文法', '作文', '会話']}
                                    data={[
                                        reportCard.vocab,
                                        reportCard.listening,
                                        reportCard.reading,
                                        reportCard.grammar,
                                        reportCard.writing,
                                        reportCard.conversation
                                    ]}
                                    title="成績通知表"
                                    color="green"
                                    min={50}
                                    stepSize={10}
                                />
                            </div>
                        </div>

                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            {/* Report Card Detailed Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', minWidth: '80px' }}>科目</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>素点 (100)</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>出席 (100)</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>参加 (100)</th>
                                        <th style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>|</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>素点評価 (70%)</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>出席評価 (20%)</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>参加評価 (10%)</th>
                                        <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#ecfdf5' }}>計 (100)</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>評定</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { label: '文字・語彙', key: 'vocab' },
                                        { label: '聴解', key: 'listening' },
                                        { label: '読解', key: 'reading' },
                                        { label: '文法', key: 'grammar' },
                                        { label: '作文', key: 'writing' },
                                        { label: '会話', key: 'conversation' },
                                    ].map((cat) => {
                                        const d = reportDetails[cat.key]
                                        return (
                                            <tr key={cat.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px' }}>{cat.label}</td>
                                                {/* Raw Scores */}
                                                <td style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>
                                                    {d.base === 0 ? '-' : Math.round(d.base / 0.7)}
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>100</td>
                                                <td style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>
                                                    {reportDetails.participation === 0 ? '-' : Math.round(reportDetails.participation / 0.1)}
                                                </td>

                                                <td style={{ padding: '8px', textAlign: 'center', color: '#d1d5db' }}>|</td>

                                                {/* Weighted Scores */}
                                                <td style={{ padding: '8px', textAlign: 'center' }}>{d.base}</td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>{reportDetails.attendance}</td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>{reportDetails.participation}</td>
                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0fdf4' }}>{d.total}</td>
                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#059669' }}>
                                                    {calculateGrade(d.total)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    <tr style={{ borderTop: '2px solid #10b981', backgroundColor: '#f0fdf4' }}>
                                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>総合評価</td>
                                        <td colSpan={7} style={{ textAlign: 'right', paddingRight: '20px' }}>（全科目の平均）</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: '#047857' }}>
                                            {reportCardTotal} <span style={{ fontSize: '0.8rem' }}>/ 100</span>
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: '#047857' }}>
                                            {calculateGrade(reportCardTotal)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default StudentGradeDetail
