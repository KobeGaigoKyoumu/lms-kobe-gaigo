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

    // --- JLPT SPECIFIC VIEW (JLPT処理結果 Layout) ---
    if (isJlpt) {
        return (
            <div style={{ padding: '0px', border: 'none', borderRadius: '12px', marginBottom: '30px', backgroundColor: 'transparent' }}>
                {/* Common Info Bar */}
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    fontSize: '0.9rem',
                    color: '#475569'
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {finalExam.level && <div><strong>レベル:</strong> {finalExam.level}</div>}
                        {finalExam.textbook && <div><strong>使用教材:</strong> {finalExam.textbook}</div>}
                        {student.yearTerm && <div><strong>試験名/学期:</strong> {student.yearTerm}</div>}
                        {finalExam.levelInfo && (
                            <>
                                <div><strong>合格点:</strong> {finalExam.levelInfo.passingScore}点</div>
                                <div>
                                    <strong>基準点:</strong> {finalExam.levelInfo.criteria1Name}({finalExam.levelInfo.criteria1Score})
                                    {finalExam.levelInfo.criteria2Name && ` / ${finalExam.levelInfo.criteria2Name}(${finalExam.levelInfo.criteria2Score})`}
                                    {finalExam.levelInfo.criteria3Name && ` / ${finalExam.levelInfo.criteria3Name}(${finalExam.levelInfo.criteria3Score})`}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className={styles.studentRow} style={{ borderLeft: finalExam.result === '合' || finalExam.result === '○' ? '4px solid #10b981' : '4px solid #ef4444', backgroundColor: '#fff', padding: '20px', borderRadius: '0 8px 8px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div className={styles.studentHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                                {student.class}
                            </div>
                            <h3 className={styles.studentName} style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {student.name}
                                <span className={styles.studentId} style={{ fontSize: '0.9rem', color: '#64748b', marginLeft: '8px' }}>({student.id})</span>
                            </h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>{student.yearTerm}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: finalExam.result === '合' || finalExam.result === '○' ? '#10b981' : '#ef4444' }}>
                                {finalExam.result === '合' || finalExam.result === '○' ? '合格' : '不合格'}
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1f2937' }}>
                                合計: {finalExam.total || finalExamSum}点
                                {finalExam.levelInfo && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}> / {finalExam.levelInfo.passingScore}点</span>}
                            </div>
                            {/* Rank hidden */}
                        </div>
                    </div>

                    <table style={{ width: '100%', marginTop: '15px', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                                <th style={{ padding: '8px', border: '1px solid #e5e7eb' }}>科目</th>
                                <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>得点</th>
                                <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>正答数</th>
                                <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>判定</th>
                                <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>評価</th>
                            </tr>
                        </thead>
                        <tbody>
                            {finalExam.level === 'N4' || finalExam.level === 'N5' ? (
                                <tr>
                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>言語知識（文字・語彙・文法）・読解</td>
                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{finalExam.grammarReading} / 120</td>
                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                        {reportDetails?.subjectCorrectCounts?.['文字・語彙']
                                            ? `${reportDetails.subjectCorrectCounts['文字・語彙'].correct + (reportDetails.subjectCorrectCounts['文法']?.correct || 0) + (reportDetails.subjectCorrectCounts['読解']?.correct || 0)} / ${reportDetails.subjectCorrectCounts['文字・語彙'].total + (reportDetails.subjectCorrectCounts['文法']?.total || 0) + (reportDetails.subjectCorrectCounts['読解']?.total || 0)}`
                                            : (finalExam.grammarReadingCorrect || '-')}
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{finalExam.judgments?.[0] || finalExam.judgments?.[1] || '-'}</td>
                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                            backgroundColor: finalExam.grammarReadingEval === 'A' ? '#dcfce7' : finalExam.grammarReadingEval === 'B' ? '#fef9c3' : '#fee2e2',
                                            color: finalExam.grammarReadingEval === 'A' ? '#166534' : finalExam.grammarReadingEval === 'B' ? '#854d0e' : '#991b1b'
                                        }}>{finalExam.grammarReadingEval}</span>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    <tr>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>言語知識（文字・語彙・文法）</td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{(finalExam.vocab || 0) + (finalExam.grammar || 0)} / 60</td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                            {reportDetails?.subjectCorrectCounts?.['文字・語彙']
                                                ? `${reportDetails.subjectCorrectCounts['文字・語彙'].correct + (reportDetails.subjectCorrectCounts['文法']?.correct || 0)} / ${reportDetails.subjectCorrectCounts['文字・語彙'].total + (reportDetails.subjectCorrectCounts['文法']?.total || 0)}`
                                                : '-'}
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{finalExam.judgments?.[0] || '-'}</td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                                backgroundColor: finalExam.vocabEval === 'A' ? '#dcfce7' : finalExam.vocabEval === 'B' ? '#fef9c3' : '#fee2e2',
                                                color: finalExam.vocabEval === 'A' ? '#166534' : finalExam.vocabEval === 'B' ? '#854d0e' : '#991b1b'
                                            }}>{finalExam.vocabEval}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>読解</td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{finalExam.reading} / 60</td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                            {reportDetails?.subjectCorrectCounts?.['読解']
                                                ? `${reportDetails.subjectCorrectCounts['読解'].correct} / ${reportDetails.subjectCorrectCounts['読解'].total}`
                                                : (finalExam.readingCorrect || '-')}
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{finalExam.judgments?.[1] || '-'}</td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                                backgroundColor: finalExam.readingEval === 'A' ? '#dcfce7' : finalExam.readingEval === 'B' ? '#fef9c3' : '#fee2e2',
                                                color: finalExam.readingEval === 'A' ? '#166534' : finalExam.readingEval === 'B' ? '#854d0e' : '#991b1b'
                                            }}>{finalExam.readingEval}</span>
                                        </td>
                                    </tr>
                                </>
                            )}
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>聴解</td>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{finalExam.listening} / 60</td>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    {reportDetails?.subjectCorrectCounts?.['聴解']
                                        ? `${reportDetails.subjectCorrectCounts['聴解'].correct} / ${reportDetails.subjectCorrectCounts['聴解'].total}`
                                        : (finalExam.listeningCorrect || '-')}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{finalExam.judgments?.[finalExam.level === 'N4' || finalExam.level === 'N5' ? 1 : 2] || '-'}</td>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                        backgroundColor: finalExam.listeningEval === 'A' ? '#dcfce7' : finalExam.listeningEval === 'B' ? '#fef9c3' : '#fee2e2',
                                        color: finalExam.listeningEval === 'A' ? '#166534' : finalExam.listeningEval === 'B' ? '#854d0e' : '#991b1b'
                                    }}>{finalExam.listeningEval}</span>
                                </td>
                            </tr>
                            <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>合計</td>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{finalExam.total || finalExamSum} / 180</td>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    {reportDetails?.subjectCorrectCounts
                                        ? `${Object.values(reportDetails.subjectCorrectCounts).reduce((acc, cur) => acc + (cur.correct || 0), 0)} / ${Object.values(reportDetails.subjectCorrectCounts).reduce((acc, cur) => acc + (cur.total || 0), 0)}`
                                        : '-'}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{finalExam.result === '合' || finalExam.result === '○' ? '合格' : '不合格'}</td>
                                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>-</td>
                            </tr>
                        </tbody>
                    </table>

                    {reportDetails?.answerDetails && reportDetails.answerDetails.length > 0 && (
                        <details style={{ marginTop: '15px' }}>
                            <summary style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: 'bold', fontSize: '0.9rem', padding: '8px 0' }}>
                                ▶ 解答詳細を表示
                            </summary>
                            <div style={{ overflowX: 'auto', marginTop: '10px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                    {['文字・語彙', '文法', '読解', '聴解'].map(sub => {
                                        const subDetails = reportDetails.answerDetails.filter(d => d.subject === sub)
                                        if (subDetails.length === 0) return null
                                        return (
                                            <div key={sub} style={{ minWidth: '200px', flex: '1' }}>
                                                <h4 style={{ fontSize: '0.85rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '8px', color: '#334155' }}>
                                                    {sub} ({reportDetails.subjectCorrectCounts?.[sub]?.correct} / {reportDetails.subjectCorrectCounts?.[sub]?.total})
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '4px' }}>
                                                    {subDetails.map((d, idx) => (
                                                        <div key={idx} style={{
                                                            padding: '4px',
                                                            fontSize: '0.7rem',
                                                            border: '1px solid #e5e7eb',
                                                            textAlign: 'center',
                                                            backgroundColor: d.isCorrect ? '#dcfce7' : '#fee2e2',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            borderRadius: '2px'
                                                        }}>
                                                            <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#475569' }}>{d.questionNo}</div>
                                                            <div style={{ fontWeight: '500' }}>{d.selected || '-'}</div>
                                                            <div style={{ fontSize: '0.6rem', color: '#64748b' }}>({d.correctAnswer})</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </details>
                    )}
                </div>
            </div>
        )
    }

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
                            {viewMode === 'exam' ? calculateFinalExamGrade(finalExamSum / 6) : calculateGrade(reportCardTotal)}
                            <span style={{ fontSize: '1rem', color: '#6b7280', marginLeft: '4px' }}>
                                ({viewMode === 'exam' ? finalExamSum : (reportCardTotal || 0).toFixed(1)})
                            </span>
                        </div>
                    </div>

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
                                const filename = viewMode === 'exam' ? `期末試験結果_${student.name}_${student.id}.pdf` : `成績通知表_${student.name}_${student.id}.pdf`;
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
}

export default StudentGradeDetail
