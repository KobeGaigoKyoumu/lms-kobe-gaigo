'use client'

import React from 'react'
import RadarChart from './RadarChart'
import styles from './page.module.css'
// export { exportStudentGradeToPDF } removed - using server-side API

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
        if (score >= 70) return 'B'
        if (score >= 60) return 'C'
        if (score >= 50) return 'D'
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
    const isJlpt = student.isJlpt || finalExam?.type === 'JLPT'

    // Handle case where important data might be missing
    if (!finalExam) return null;

    // --- JLPT SPECIFIC VIEW ---
    if (isJlpt) {
        return (
            <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', marginBottom: '30px', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {student.name} <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal' }}>({student.id})</span>
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {finalExam.level} - {finalExam.textbook} ({student.class})
                        </div>
                    </div>
                    <div style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: finalExam.result === '合' ? '#dcfce7' : '#fee2e2', color: finalExam.result === '合' ? '#166534' : '#991b1b', fontWeight: 'bold' }}>
                        {finalExam.result === '合' ? '合格' : '不合格'} ({finalExam.total}点 / Rank: {finalExam.rank})
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    {[
                        { label: '文字・語彙', score: finalExam.vocab, correct: finalExam.vocabCorrect, eval: finalExam.vocabEval },
                        { label: '文法', score: finalExam.grammar, correct: finalExam.grammarCorrect, eval: finalExam.grammarEval },
                        { label: '読解', score: finalExam.reading, correct: finalExam.readingCorrect, eval: finalExam.readingEval },
                        { label: '言語知識(文・言・読)', score: finalExam.grammarReading, correct: finalExam.grammarReadingCorrect, eval: finalExam.grammarReadingEval },
                        { label: '聴解', score: finalExam.listening, correct: finalExam.listeningCorrect, eval: finalExam.listeningEval },
                    ].filter(item => item.score !== undefined).map((item, idx) => (
                        <div key={idx} style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>{item.label}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{item.score} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>点</span></div>
                                <div style={{ fontSize: '0.9rem', color: '#374151' }}>{item.correct} / {item.eval}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {reportDetails?.answerDetails && (
                    <div style={{ marginTop: '15px', fontSize: '0.8rem', color: '#6b7280' }}>
                        ※ 正誤詳細データあり
                    </div>
                )}
            </div>
        )
    }

    // --- NORMAL GRADE VIEW ---
    if (!reportDetails) return null;

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

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ textAlign: 'center', padding: '5px 15px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>
                            {viewMode === 'exam' ? '期末試験 (合計)' : '総合評価 (合計)'}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: viewMode === 'exam' ? '#3b82f6' : '#059669' }}>
                            {viewMode === 'exam'
                                ? calculateFinalExamGrade(finalExamSum / 6)
                                : calculateGrade(reportCardTotal)
                            }
                            <span style={{ fontSize: '1rem', color: '#6b7280', marginLeft: '4px' }}>
                                ({viewMode === 'exam' ? finalExamSum : reportCardTotal.toFixed(1)})
                            </span>
                        </div>
                    </div>

                    {/* PDF Export Button */}
                    <button
                        onClick={async (e) => {
                            try {
                                const btn = e.currentTarget;
                                const originalText = btn.innerText;
                                btn.innerText = '生成中...';
                                btn.disabled = true;

                                const payload = {
                                    yearTerm: student.yearTerm || '',
                                    type: viewMode === 'exam' ? 'final_exam' : 'report_card'
                                };

                                if (viewMode === 'exam') {
                                    // Payload for Final Exam PDF (only exam data needed)
                                    payload.student = {
                                        student_id_text: student.id,
                                        student_name: student.name,
                                        class_name: student.class,
                                        final_exam_total: finalExamSum,
                                        final_exam_data: finalExam // Use finalExam object directly
                                    };
                                } else {
                                    // Payload for Report Card PDF (needs everything)
                                    payload.student = {
                                        student_id_text: student.id,
                                        student_name: student.name,
                                        class_name: student.class,
                                        final_exam_total: finalExamSum,
                                        report_card_total: reportCardTotal,
                                        report_card_data: reportDetails
                                    };
                                }

                                const response = await fetch('/api/grades/report/generate', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                });

                                if (!response.ok) throw new Error('PDF生成に失敗しました');

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                const filename = viewMode === 'exam'
                                    ? `期末試験結果_${student.name}_${student.id}.pdf`
                                    : `成績通知表_${student.name}_${student.id}.pdf`;
                                a.download = filename;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);

                                btn.innerText = originalText;
                                btn.disabled = false;
                            } catch (err) {
                                console.error(err);
                                alert('PDFの出力中にエラーが発生しました');
                                const btn = document.querySelector(`button[data-student-id="${student.id}"]`);
                                if (btn) {
                                    btn.innerText = 'PDF';
                                    btn.disabled = false;
                                }
                            }
                        }}
                        data-student-id={student.id}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.85rem',
                            height: '100%'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        PDF出力
                    </button>
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
                                        finalExam?.vocab || 0,
                                        finalExam?.listening || 0,
                                        finalExam?.reading || 0,
                                        finalExam?.grammar || 0,
                                        finalExam?.writing || 0,
                                        finalExam?.conversation || 0
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
                                        { label: '文字・語彙', val: finalExam?.vocab || 0 },
                                        { label: '聴解', val: finalExam?.listening || 0 },
                                        { label: '読解', val: finalExam?.reading || 0 },
                                        { label: '文法', val: finalExam?.grammar || 0 },
                                        { label: '作文', val: finalExam?.writing || 0 },
                                        { label: '会話', val: finalExam?.conversation || 0 },
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
                                        reportCard?.vocab || 0,
                                        reportCard?.listening || 0,
                                        reportCard?.reading || 0,
                                        reportCard?.grammar || 0,
                                        reportCard?.writing || 0,
                                        reportCard?.conversation || 0
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
                                        <th style={{ padding: '8px', textAlign: 'center' }}>基礎点 (70)</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>出席点 (15)</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>平常点 (15)</th>
                                        <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>合計 (100)</th>
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
                                        const d = reportDetails[cat.key] || {}
                                        return (
                                            <tr key={cat.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px' }}>{cat.label}</td>
                                                {/* Weighted Scores (Corrected View) */}
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    {d.base?.toFixed(1) || '0.0'}
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    {reportDetails.attendance?.toFixed(1) || '0.0'}
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    {reportDetails.participation?.toFixed(1) || '0.0'}
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                                                    {d.total?.toFixed(1) || '0.0'}
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#059669' }}>
                                                    {calculateGrade(d.total || 0)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    <tr style={{ borderTop: '2px solid #10b981', backgroundColor: '#f0fdf4' }}>
                                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>総合評価</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}></td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}></td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}></td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: '#047857' }}>
                                            {(reportCardTotal || 0).toFixed(1)} <span style={{ fontSize: '0.8rem' }}>/ 100</span>
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: '#047857' }}>
                                            {calculateGrade(reportCardTotal || 0)}
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
