'use client'

import React from 'react'
import RadarChart from './RadarChart'
import styles from './page.module.css'
// export { exportStudentGradeToPDF } removed - using server-side API

const StudentGradeDetail = ({ student, viewMode }) => {
    const calculateGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 70) return 'B'
        if (score >= 60) return 'C'
        if (score >= 50) return 'D'
        return 'F'
    }

    // Calculate Final Exam Letter Grade
    const calculateFinalExamGrade = (score, isJlpt = false) => {
        if (isJlpt) {
            // For JLPT, we don't usually use A-F like this, but if reuse requested:
            const percent = (score / 180) * 100;
            if (percent >= 80) return 'A'
            if (percent >= 60) return 'B'
            if (percent >= 40) return 'C'
            if (percent >= 20) return 'D'
            return 'F'
        }
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

    // Adapt Categories for Table and Chart
    const examCategories = isJlpt ? [
        { label: '文字・語彙', val: finalExam?.vocab || 0, key: 'vocab' },
        { label: '文法', val: finalExam?.grammar || 0, key: 'grammar' },
        { label: '読解', val: finalExam?.reading || 0, key: 'reading' },
        { label: '聴解', val: finalExam?.listening || 0, key: 'listening' },
        { label: '言語知識(文・言・読)', val: finalExam?.grammarReading || 0, key: 'grammarReading' },
    ].filter(c => c.val !== undefined && c.val !== null) : [
        { label: '文字・語彙', val: finalExam?.vocab || 0, key: 'vocab' },
        { label: '聴解', val: finalExam?.listening || 0, key: 'listening' },
        { label: '読解', val: finalExam?.reading || 0, key: 'reading' },
        { label: '文法', val: finalExam?.grammar || 0, key: 'grammar' },
        { label: '作文', val: finalExam?.writing || 0, key: 'writing' },
        { label: '会話', val: finalExam?.conversation || 0, key: 'conversation' },
    ];

    const reportCategories = [
        { label: '文字・語彙', key: 'vocab' },
        { label: '聴解', key: 'listening' },
        { label: '読解', key: 'reading' },
        { label: '文法', key: 'grammar' },
        { label: '作文', key: 'writing' },
        { label: '会話', key: 'conversation' },
    ];

    return (
        <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', marginBottom: '30px', backgroundColor: '#fff' }}>
            {/* Header: Name & Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '15px' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {student.name} <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>({student.id})</span>
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {isJlpt ? `${finalExam.level} - ${finalExam.textbook} (${student.class})` : student.class}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ textAlign: 'center', padding: '5px 15px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>
                            {isJlpt ? '模擬試験結果' : (viewMode === 'exam' ? '期末試験 (合計)' : '総合評価 (合計)')}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: (isJlpt || viewMode === 'exam') ? '#3b82f6' : '#059669' }}>
                            {isJlpt
                                ? (finalExam.result === '合' ? '合格' : '不合格')
                                : (viewMode === 'exam' ? calculateFinalExamGrade(finalExamSum / 6) : calculateGrade(reportCardTotal))
                            }
                            <span style={{ fontSize: '1rem', color: '#6b7280', marginLeft: '4px' }}>
                                ({isJlpt ? finalExamSum : (viewMode === 'exam' ? finalExamSum : (reportCardTotal || 0).toFixed(1))})
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
                                    type: isJlpt ? 'jlpt' : (viewMode === 'exam' ? 'final_exam' : 'report_card')
                                };

                                payload.student = {
                                    student_id_text: student.id,
                                    student_name: student.name,
                                    class_name: student.class,
                                    final_exam_total: finalExamSum,
                                    final_exam_data: finalExam,
                                    report_card_total: reportCardTotal,
                                    report_card_data: reportDetails
                                };

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
                                const filename = isJlpt
                                    ? `JLPT結果_${student.name}_${student.id}.pdf`
                                    : (viewMode === 'exam' ? `期末試験結果_${student.name}_${student.id}.pdf` : `成績通知表_${student.name}_${student.id}.pdf`);
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
                {(isJlpt || viewMode === 'exam') ? (
                    <>
                        <div className={styles.chartWrapper}>
                            <h4 className={styles.chartTitle}>{isJlpt ? 'JLPT結果詳細' : '期末試験結果'} (合計: {finalExamSum}/{isJlpt ? 180 : 600})</h4>
                            <div className={styles.chartContainer}>
                                <RadarChart
                                    labels={examCategories.map(c => c.label)}
                                    data={examCategories.map(c => c.val)}
                                    title={isJlpt ? "JLPT模試" : "期末試験"}
                                    color="blue"
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>科目</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>点数 {isJlpt ? '' : '(100点満点)'}</th>
                                        <th style={{ padding: '10px', textAlign: 'center' }}>判定</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {examCategories.map((cat, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '12px 10px' }}>{cat.label}</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right' }}>{cat.val}</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold' }}>
                                                {isJlpt ? (finalExam[cat.key + 'Eval'] || '-') : calculateFinalExamGrade(cat.val)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>
                                        <td style={{ padding: '12px 10px' }}>合計</td>
                                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>{finalExamSum} / {isJlpt ? 180 : 600}</td>
                                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                            {isJlpt ? (finalExam.result === '合' ? '合格' : '不合格') : calculateFinalExamGrade(finalExamSum / 6)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Normal Report Card View (Already refined in previous step) */}
                        <div className={styles.chartWrapper}>
                            <h4 className={styles.chartTitle}>成績通知表 (総合成績: {reportCardTotal})</h4>
                            <div className={styles.chartContainer}>
                                <RadarChart
                                    labels={reportCategories.map(c => c.label)}
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
                                    {reportCategories.map((cat) => {
                                        const d = reportDetails?.[cat.key] || {}
                                        return (
                                            <tr key={cat.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px' }}>{cat.label}</td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>{d.base?.toFixed(1) || '0.0'}</td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>{reportDetails?.attendance?.toFixed(1) || '0.0'}</td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>{reportDetails?.participation?.toFixed(1) || '0.0'}</td>
                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{d.total?.toFixed(1) || '0.0'}</td>
                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#059669' }}>{calculateGrade(d.total || 0)}</td>
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
