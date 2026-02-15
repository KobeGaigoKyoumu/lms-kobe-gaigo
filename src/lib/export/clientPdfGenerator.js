/**
 * Generates an attendance PDF on the client side.
 * @param {Object} data - The same data structure used for student stats and history.
 * @returns {Promise<Blob>}
 */
export async function generateAttendancePDFClient(data) {
    const { student, history } = data;
    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    const nameLength = (student.name || '').length;
    let nameFontSize = '14pt';
    if (nameLength > 30) nameFontSize = '9pt';
    else if (nameLength > 22) nameFontSize = '11pt';
    else if (nameLength > 15) nameFontSize = '12.5pt';

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = '"Noto Sans JP", sans-serif';
    container.style.color = '#333';
    container.style.boxSizing = 'border-box';
    container.style.lineHeight = '1.3';

    // Data preparation
    const monthlyData = [...(history.monthlyData || [])];
    const cumulativeData = [...(history.cumulativeData || [])];

    let combinedRows = monthlyData.map(m => {
        const c = cumulativeData.find(cum => cum.year === m.year && cum.month === m.month) || {};
        return {
            year: m.year,
            month: m.month,
            class_days: (m.attendance_days || 0) + (m.absence_days || 0),
            attendance_days: m.attendance_days,
            absence_days: m.absence_days,
            late_slots: m.late_slots,
            monthly_rate: m.attendance_rate,
            cumulative_rate: c.attendance_rate
        };
    });

    combinedRows.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));

    const latestData = combinedRows.length > 0 ? combinedRows[0] : { year: '----', month: '--', monthly_rate: 0 };
    const latestMonthlyRate = latestData.monthly_rate !== undefined ? latestData.monthly_rate : 0;
    const latestRatePercent = (latestMonthlyRate * 100).toFixed(1);

    let rateClass = '';
    if (latestMonthlyRate <= 0.80) rateClass = 'color: #d32f2f;';
    else if (latestMonthlyRate <= 0.85) rateClass = 'color: #f57c00;';
    else if (latestMonthlyRate <= 0.90) rateClass = 'color: #fbc02d;';
    else if (latestMonthlyRate <= 0.95) rateClass = 'color: #0288d1;';
    else rateClass = 'color: #2e7d32;';

    const rowsHtml = combinedRows.map(row => {
        const mRate = row.monthly_rate;
        const cRate = row.cumulative_rate;

        const getRateStyle = (rate) => {
            if (rate <= 0.80) return 'color: #c62828; font-weight: bold;';
            if (rate <= 0.85) return 'color: #e65100; font-weight: bold;';
            if (rate <= 0.90) return 'color: #f9a825; font-weight: bold;';
            if (rate <= 0.95) return 'color: #0277bd; font-weight: bold;';
            return 'color: #2e7d32; font-weight: bold;';
        };

        return `
            <tr>
                <td style="border: 1px solid #999; padding: 4px; text-align: center;"><div class="baseline-lift" style="top: -0.6mm;">${row.year}年${row.month}月</div></td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center;"><div class="baseline-lift" style="top: -0.6mm;">${row.class_days}</div></td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center;"><div class="baseline-lift" style="top: -0.6mm;">${row.attendance_days}</div></td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center;"><div class="baseline-lift" style="top: -0.6mm;">${row.absence_days}</div></td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center;"><div class="baseline-lift" style="top: -0.6mm;">${row.late_slots !== undefined ? row.late_slots : '-'}</div></td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center; ${getRateStyle(cRate)}"><div class="baseline-lift" style="top: -0.6mm;">${cRate !== undefined ? (cRate * 100).toFixed(1) + '%' : '-'}</div></td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center; ${getRateStyle(mRate)}"><div class="baseline-lift" style="top: -0.6mm;">${mRate !== undefined ? (mRate * 100).toFixed(1) + '%' : '-'}</div></td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <style>
            .pdf-page {
                width: 210mm;
                padding: 10mm 15mm;
                background: white;
                font-family: "Noto Sans JP", sans-serif;
                color: #333;
                box-sizing: border-box;
                line-height: 1.3;
            }
            .pdf-page * { box-sizing: border-box; margin: 0; padding: 0; }
            .baseline-lift {
                position: relative;
                top: -1.0mm;
            }
        </style>
        <div class="pdf-page">
            <div style="text-align: right; font-size: 10pt; margin-bottom: 2mm;">発行日：${today}</div>
        <div style="text-align: center; margin-bottom: 2mm;">
            <h1 style="font-size: 26pt; font-weight: bold; margin: 0; color: #333; letter-spacing: 2px;">神戸外語教育学院</h1>
        </div>
        <div style="position: relative; height: 32mm; border-bottom: 2px solid #333; margin-bottom: 3mm;">
            <div style="position: absolute; bottom: 1mm; left: 0;">
                <div style="font-weight: bold; font-size: 11pt; margin-bottom: 2px;">学籍番号：${student.id}</div>
                <div style="font-weight: bold; font-size: ${nameFontSize}; margin-bottom: 3px;">名前：${student.name}</div>
                <div style="font-weight: bold; font-size: 11pt;">クラス：${student.className || ''}</div>
            </div>
            <div style="position: absolute; bottom: 1mm; right: 0; width: 60mm; height: 26mm; border: 2px solid #333; border-radius: 8px; background: #fff; overflow: hidden;">
                <div style="height: 8mm; background-color: #f5f5f5; border-bottom: 1px solid #333; font-size: 8pt; display: flex; align-items: center; justify-content: center; text-align: center; color: #555;">
                    <div class="baseline-lift" style="top: -0.5mm;">${latestData.year}年${latestData.month}月出席率</div>
                </div>
                <div style="height: 18mm; display: flex; align-items: center; justify-content: center; font-size: 22pt; font-weight: bold; ${rateClass}">
                    <div class="baseline-lift" style="top: -1mm;">${latestRatePercent}%</div>
                </div>
            </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 3mm; font-size: 9pt;">
            <thead>
                <tr style="background-color: #f0f0f0;">
                    <th style="border: 1px solid #999; padding: 6px; font-weight: normal; color: #555;">年月</th>
                    <th style="border: 1px solid #999; padding: 6px; font-weight: normal; color: #555;">授業日数</th>
                    <th style="border: 1px solid #999; padding: 6px; font-weight: normal; color: #555;">出席日数</th>
                    <th style="border: 1px solid #999; padding: 6px; font-weight: normal; color: #555;">欠席日数</th>
                    <th style="border: 1px solid #999; padding: 6px; font-weight: normal; color: #555;">遅刻・早退</th>
                    <th style="border: 1px solid #999; padding: 6px; font-weight: normal; color: #555;">累計出席率</th>
                    <th style="border: 1px solid #999; padding: 6px; font-weight: normal; color: #555;">月間出席率</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
        <div style="display: flex; justify-content: flex-end; font-size: 8pt; gap: 10px; margin-top: 3mm;">
            <div><span style="color: #0277bd;">■</span> 95%以上</div>
            <div><span style="color: #f9a825;">■</span> 90%以上</div>
            <div><span style="color: #e65100;">■</span> 85%以上</div>
            <div><span style="color: #c62828;">■</span> 80%以下</div>
        </div>
        <div style="margin-top: 4mm; font-size: 7.5pt; color: #333; line-height: 1.3;">
            <p>※ 累計出席率が90%以下の場合は次のビザの更新に影響が出る可能性があります。</p>
            <p>※ 本校では累計出席率85%以下の者に指定校推薦書および学校推薦書を発行しません。</p>
            <p>※ 本書は出席証明書ではありません。</p>
        </div>
    `;

    document.body.appendChild(container);

    try {
        if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready;
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        return pdf.output('blob');
    } finally {
        document.body.removeChild(container);
    }
}


/**
 * Generates a grade report PDF on the client side.
 * @param {Object} data - Payload containing student info, type, and exam/report data.
 * @returns {Promise<Blob>}
 */
export async function generateGradePDFClient(data) {
    const { student, type, yearTerm } = data;
    const isJlpt = type === 'final_exam' && (yearTerm?.startsWith('JLPT') || student.final_exam_data?.type === 'JLPT');
    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    const calculateGrade = (score) => {
        if (score >= 80) return 'A';
        if (score >= 60) return 'B';
        if (score >= 40) return 'C';
        if (score >= 20) return 'D';
        return 'F';
    };

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = isJlpt ? '"Noto Sans JP", sans-serif' : '"Noto Serif JP", serif';
    container.style.color = '#000';
    container.style.lineHeight = '1.3';
    container.style.boxSizing = 'border-box';

    const isExam = type === 'final_exam';
    let subjectRows = '';
    let detailsHtml = '';

    if (isJlpt) {
        // Modern JLPT Mock Exam Results Design
        const finalExam = student.final_exam_data || {};
        const reportDetails = student.report_card_data || {};
        const totalScore = student.final_exam_total || 0;

        const getEvalStr = (score, max) => {
            if (score > (max * 2 / 3)) return 'A';
            if (score > (max / 3)) return 'B';
            return 'C';
        };

        const getEvalStyle = (val) => {
            if (val === 'A') return 'background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;';
            if (val === 'B') return 'background-color: #fef9c3; color: #854d0e; border: 1px solid #fef08a;';
            return 'background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca;';
        };

        if (finalExam.level === 'N4' || finalExam.level === 'N5') {
            const vocab = reportDetails.subjectCorrectCounts?.['文字・語彙'] || reportDetails.subjectCorrectCounts?.['文字語彙'] || reportDetails.subjectCorrectCounts?.['語彙'] || { correct: 0, total: 0 };
            const grammar = reportDetails.subjectCorrectCounts?.['文法'] || { correct: 0, total: 0 };
            const reading = reportDetails.subjectCorrectCounts?.['読解'] || { correct: 0, total: 0 };
            const combinedScore = (finalExam.vocab || 0) + (finalExam.grammarReading || 0);
            const combinedCorrect = vocab.correct + grammar.correct + reading.correct;
            const combinedTotalQ = vocab.total + grammar.total + reading.total;
            const eStr = getEvalStr(combinedScore, 120);

            subjectRows = `
                <tr>
                    <td style="font-weight: 500; text-align: left;"><div class="baseline-lift">言語知識（文字・語彙・文法）・読解</div></td>
                    <td style="text-align: right; font-weight: 600;"><div class="baseline-lift">${combinedScore} / 120</div></td>
                    <td style="text-align: center; color: #475569;"><div class="baseline-lift">${combinedCorrect} / ${combinedTotalQ}</div></td>
                    <td style="text-align: center; font-weight: 600;"><div class="baseline-lift">${finalExam.judgments?.[0] || finalExam.judgments?.[1] || '-'}</div></td>
                    <td style="text-align: center;">
                        <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <div class="evaluation-circle" style="${getEvalStyle(eStr)}">
                                <div class="baseline-lift">${eStr}</div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            const vocabScore = (finalExam.vocab || 0) + (finalExam.grammar || 0);
            const vocabCounts = reportDetails.subjectCorrectCounts?.['文字・語彙'] || reportDetails.subjectCorrectCounts?.['文字語彙'] || reportDetails.subjectCorrectCounts?.['語彙'] || { correct: 0, total: 0 };
            const grammarCounts = reportDetails.subjectCorrectCounts?.['文法'] || { correct: 0, total: 0 };
            const vCorrect = vocabCounts.correct + grammarCounts.correct;
            const vTotal = vocabCounts.total + grammarCounts.total;
            const vEval = getEvalStr(vocabScore, 60);

            const rScore = finalExam.reading || 0;
            const rCounts = reportDetails.subjectCorrectCounts?.['読解'] || { correct: 0, total: 0 };
            const rEval = getEvalStr(rScore, 60);

            subjectRows = `
                <tr>
                    <td style="font-weight: 500; text-align: left;"><div class="baseline-lift">言語知識（文字・語彙・文法）</div></td>
                    <td style="text-align: right; font-weight: 600;"><div class="baseline-lift">${vocabScore} / 60</div></td>
                    <td style="text-align: center; color: #475569;"><div class="baseline-lift">${vCorrect} / ${vTotal}</div></td>
                    <td style="text-align: center; font-weight: 600;"><div class="baseline-lift">${finalExam.judgments?.[0] || '-'}</div></td>
                    <td style="text-align: center;">
                        <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <div class="evaluation-circle" style="${getEvalStyle(vEval)}">
                                <div class="baseline-lift">${vEval}</div>
                            </div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="font-weight: 500; text-align: left;"><div class="baseline-lift">読解</div></td>
                    <td style="text-align: right; font-weight: 600;"><div class="baseline-lift">${rScore} / 60</div></td>
                    <td style="text-align: center; color: #475569;"><div class="baseline-lift">${rCounts.correct} / ${rCounts.total}</div></td>
                    <td style="text-align: center; font-weight: 600;"><div class="baseline-lift">${finalExam.judgments?.[1] || '-'}</div></td>
                    <td style="text-align: center;">
                        <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <div class="evaluation-circle" style="${getEvalStyle(rEval)}">
                                <div class="baseline-lift">${rEval}</div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }

        const lScore = finalExam.listening || 0;
        const lCounts = reportDetails.subjectCorrectCounts?.['聴解'] || { correct: 0, total: 0 };
        const lEval = getEvalStr(lScore, 60);
        const lJudgeIdx = (finalExam.level === 'N4' || finalExam.level === 'N5') ? 1 : 2;

        subjectRows += `
            <tr>
                <td style="font-weight: 500; text-align: left;"><div class="baseline-lift">聴解</div></td>
                <td style="text-align: right; font-weight: 600;"><div class="baseline-lift">${lScore} / 60</div></td>
                <td style="text-align: center; color: #475569;"><div class="baseline-lift">${lCounts.correct} / ${lCounts.total}</div></td>
                <td style="text-align: center; font-weight: 600;"><div class="baseline-lift">${finalExam.judgments?.[lJudgeIdx] || '-'}</div></td>
                <td style="text-align: center;">
                    <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                        <div class="evaluation-circle" style="${getEvalStyle(lEval)}">
                            <div class="baseline-lift">${lEval}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;

        const totalEval = getEvalStr(totalScore, 180);
        const counts = reportDetails.subjectCorrectCounts || {};
        const vC = counts['文字・語彙'] || counts['文字語彙'] || counts['語彙'] || { correct: 0, total: 0 };
        const gC = counts['文法'] || { correct: 0, total: 0 };
        const rC = counts['読解'] || { correct: 0, total: 0 };
        const lC = counts['聴解'] || { correct: 0, total: 0 };
        const allCorrect = vC.correct + gC.correct + rC.correct + lC.correct;
        const allTotal = vC.total + gC.total + rC.total + lC.total;

        subjectRows += `
            <tr style="background-color: #f8fafc; font-weight: bold;">
                <td style="text-align: left;"><div class="baseline-lift">合計</div></td>
                <td style="text-align: right;"><div class="baseline-lift">${totalScore} / 180</div></td>
                <td style="text-align: center; color: #475569;"><div class="baseline-lift">${allCorrect} / ${allTotal}</div></td>
                <td style="text-align: center;"><div class="baseline-lift">${finalExam.result === '合' || finalExam.result === '○' ? '合格' : '不合格'}</div></td>
                <td style="text-align: center;">
                    <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                        <div class="evaluation-circle" style="${getEvalStyle(totalEval)}">
                            <div class="baseline-lift">${totalEval}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;

        if (reportDetails.answerDetails && reportDetails.answerDetails.length > 0) {
            const categories = ['文字・語彙', '文法', '読解', '聴解'];
            detailsHtml = categories.map(sub => {
                const subDetails = reportDetails.answerDetails.filter(d => {
                    if (sub === '文字・語彙') return d.subject === '文字・語彙' || d.subject === '文字語彙' || d.subject === '語彙';
                    return d.subject === sub;
                });
                if (subDetails.length === 0) return '';
                const catCounts = sub === '文字・語彙'
                    ? (reportDetails.subjectCorrectCounts?.['文字・語彙'] || reportDetails.subjectCorrectCounts?.['文字語彙'] || reportDetails.subjectCorrectCounts?.['語彙'])
                    : reportDetails.subjectCorrectCounts?.[sub];

                return `
                    <div style="margin-bottom: 8px;">
                        <h4 style="font-size: 8pt; font-weight: bold; color: #334155; margin-bottom: 4px; padding-left: 6px; border-left: 3px solid #64748b; height: 12pt; display: flex; align-items: center;">
                            <div class="baseline-lift" style="top: -0.6mm;">${sub} <span style="font-size: 7.5pt; color: #64748b; font-weight: normal; margin-left: 4px;">(${catCounts?.correct || 0} / ${catCounts?.total || 0})</span></div>
                        </h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${subDetails.map(d => `
                                <div class="rigid-box" style="width: 38px; border: 1px solid ${d.isCorrect ? '#bbf7d0' : '#fecaca'}; border-radius: 3px; background-color: ${d.isCorrect ? '#f0fdf4' : '#fef2f2'};">
                                    <div class="baseline-lift" style="font-size: 6.5pt; font-weight: bold; color: #64748b; top: -0.3mm;">${d.questionNo}</div>
                                    <div class="baseline-lift" style="font-size: 8pt; font-weight: 700; color: #1e293b; top: -0.5mm;">${d.selected || '-'}</div>
                                    <div class="baseline-lift" style="font-size: 6pt; color: #94a3b8; top: -0.3mm;">(${d.correctAnswer})</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } else {
        // Standard Grade Report Design
        const subjects = ['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'];
        const subjectNames = { 'vocab': '文字・語彙', 'grammar': '文法', 'reading': '読解', 'listening': '聴解', 'writing': '作文', 'conversation': '会話' };
        let reportData = student.report_card_data || {};

        if (isExam) {
            subjectRows = subjects.map(key => `
            <tr>
                    <td style="font-weight: bold; width: 40%; font-size: 11pt; text-align: left;"><div class="baseline-lift">${subjectNames[key]}</div></td>
                    <td style="width: 20%;"><div class="baseline-lift">100</div></td>
                    <td style="font-weight: bold; width: 20%;"><div class="baseline-lift">${student.final_exam_data?.[key] || '-'}</div></td>
                    <td style="font-weight: bold; width: 20%;"><div class="baseline-lift">${calculateGrade(student.final_exam_data?.[key])}</div></td>
                </tr>
            `).join('');
        } else {
            const att = reportData.attendance;
            const part = reportData.participation;
            subjectRows = subjects.map(key => {
                const d = reportData[key] || {};
                return `
                    <tr>
                        <td style="font-weight: bold; width: 25%; font-size: 10pt; text-align: left;"><div class="baseline-lift">${subjectNames[key]}</div></td>
                        <td style="width: 15%;"><div class="baseline-lift">${d.base !== undefined ? d.base.toFixed(1) : '-'}</div></td>
                        <td style="width: 15%;"><div class="baseline-lift">${att !== undefined ? att.toFixed(1) : '-'}</div></td>
                        <td style="width: 15%;"><div class="baseline-lift">${part !== undefined ? part.toFixed(1) : '-'}</div></td>
                        <td style="font-weight: bold; width: 15%;"><div class="baseline-lift">${d.total !== undefined ? d.total.toFixed(1) : '-'}</div></td>
                        <td style="font-weight: bold; width: 15%;"><div class="baseline-lift">${d.total !== undefined ? calculateGrade(d.total) : '-'}</div></td>
                    </tr>
            `;
            }).join('');
        }
    }

    let contentHtml = '';

    const nameLength = (student.student_name || '').length;
    let nameFontSize = '12pt';
    if (nameLength > 30) nameFontSize = '8pt';
    else if (nameLength > 22) nameFontSize = '9pt';
    else if (nameLength > 15) nameFontSize = '10.5pt';

    contentHtml = `
        <style>
            .pdf-page {
                width: 210mm;
                padding: ${isJlpt ? '15mm 15mm 15mm' : '25mm 20mm 20mm'};
                background: white;
                font-family: ${isJlpt ? '"Noto Sans JP", sans-serif' : '"Noto Serif JP", serif'};
                color: ${isJlpt ? '#334155' : '#000'};
                box-sizing: border-box;
                line-height: 1.3;
                -webkit-font-smoothing: antialiased;
                margin-top: -1.2mm;
            }
            .pdf-page * { box-sizing: border-box; margin: 0; padding: 0; }
            .pdf-table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; }
            .pdf-table th, .pdf-table td { 
                border: 1px solid #000; 
                padding: 4px 6px 7px 6px !important; 
                vertical-align: middle !important; 
                line-height: 1.1 !important;
                height: 42px;
                text-align: center;
                overflow: hidden;
            }
            .jlpt-table { 
                width: 100%; 
                border-collapse: collapse; 
                border: 1px solid #e2e8f0; 
                table-layout: fixed;
            }
            .jlpt-table th, .jlpt-table td { 
                border: 1px solid #e2e8f0; 
                padding: 10px 12px !important; 
                vertical-align: middle !important; 
                line-height: 1 !important;
                font-size: 10pt;
                height: 46px;
                text-align: center;
            }
            .baseline-lift {
                position: relative;
                top: -1.8mm !important; /* Aggressive lift for JLPT/Grade reports */
            }
            .rigid-box {
                display: inline-block;
                vertical-align: top;
                text-align: center;
                padding-top: 3px;
                padding-bottom: 0;
                min-height: 38px;
                line-height: 1.1;
                box-sizing: border-box;
            }
            .evaluation-circle {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                font-size: 9pt;
                font-weight: 800;
                margin: 0 auto;
                line-height: 24px; /* Explicit line-height for centering */
                text-align: center;
            }
        </style>
        <div class="pdf-page">
            ${isJlpt ? `
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 15px; margin-bottom: 8px;">
                    <table style="width: 100%; border: none;">
                        <tr>
                            <td style="padding: 2px 0; font-size: 8pt; color: #475569;"><div class="baseline-lift" style="top: -0.6mm;"><strong>レベル:</strong> ${student.final_exam_data?.level || '-'}</div></td>
                            <td style="padding: 2px 0; font-size: 8pt; color: #475569;"><div class="baseline-lift" style="top: -0.6mm;"><strong>使用教材:</strong> ${student.final_exam_data?.textbook || '-'}</div></td>
                            <td style="padding: 2px 0; font-size: 8pt; color: #475569;"><div class="baseline-lift" style="top: -0.6mm;"><strong>試験名/学期:</strong> ${yearTerm || '-'}</div></td>
                            <td style="padding: 2px 0; font-size: 8pt; color: #475569;"><div class="baseline-lift" style="top: -0.6mm;"><strong>合格点:</strong> ${student.final_exam_data?.levelInfo?.passingScore || '-'}点</div></td>
                        </tr>
                    </table>
                </div>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 15px; margin-bottom: 15px; font-size: 8pt; color: #475569;">
                    <div class="baseline-lift" style="top: -0.6mm;"><strong>基準点:</strong> ${student.final_exam_data?.levelInfo?.categoryPassingScores ? Object.entries(student.final_exam_data.levelInfo.categoryPassingScores).map(([k, v]) => `${k}(${v})`).join(' / ') : '文字・語彙・文法・読解(38) / 基準なし(0) / 聴解(19)'}</div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; border: 1px solid #e2e8f0; border-left: 4px solid ${student.final_exam_data?.result === '合' || student.final_exam_data?.result === '○' ? '#10b981' : '#ef4444'}; border-radius: 6px; margin-bottom: 10px; background-color: #fff;">
                    <div>
                        <div style="font-size: 7.5pt; color: #64748b; margin-bottom: 2px;"><div class="baseline-lift" style="top: -0.4mm;">${student.class_name}</div></div>
                        <h3 style="font-size: ${nameFontSize}; font-weight: bold; color: #1e293b; margin: 0; line-height: 1.2;">
                            <div class="baseline-lift" style="top: -0.8mm;">${student.student_name}<span style="font-size: 9pt; color: #64748b; font-weight: normal; margin-left: 6px;">(${student.student_id_text})</span></div>
                        </h3>
                        <div style="font-size: 8pt; color: #6b7280; margin-top: 2px;"><div class="baseline-lift" style="top: -0.4mm;">${yearTerm}</div></div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <div style="text-align: center; padding: 4px 12px; border-radius: 6px; min-width: 80px; border: 1px solid #000; background-color: #fff;">
                            <div class="baseline-lift" style="font-size: 6.5pt; color: #64748b; top: -0.5mm;">合計点</div>
                            <div class="baseline-lift" style="font-size: 11pt; font-weight: bold; top: -1.0mm;">${student.final_exam_total || 0}点 <span style="font-size: 8.5pt; color: #64748b; font-weight: normal;">/ 180</span></div>
                        </div>
                        <div style="text-align: center; padding: 4px 12px; border-radius: 6px; min-width: 80px; border: 1px solid ${student.final_exam_data?.result === '合' || student.final_exam_data?.result === '○' ? '#10b981' : '#ef4444'}; background-color: ${student.final_exam_data?.result === '合' || student.final_exam_data?.result === '○' ? '#f0fdf4' : '#fef2f2'};">
                            <div class="baseline-lift" style="font-size: 6.5pt; color: ${student.final_exam_data?.result === '合' || student.final_exam_data?.result === '○' ? '#166534' : '#991b1b'}; top: -0.5mm;">判定</div>
                            <div class="baseline-lift" style="font-size: 11pt; font-weight: 800; color: ${student.final_exam_data?.result === '合' || student.final_exam_data?.result === '○' ? '#10b981' : '#ef4444'}; top: -1.0mm;">${student.final_exam_data?.result === '合' || student.final_exam_data?.result === '○' ? '合格' : '不合格'}</div>
                        </div>
                    </div>
                </div>

                <table class="jlpt-table" style="margin-bottom: 10px;">
                    <thead>
                        <tr style="background-color: #f9fafb;">
                            <th style="font-size: 8.5pt; font-weight: 600; text-align: left;"><div class="baseline-lift">科目</div></th>
                            <th style="font-size: 8.5pt; font-weight: 600; text-align: right;"><div class="baseline-lift">得点</div></th>
                            <th style="font-size: 8.5pt; font-weight: 600; text-align: center;"><div class="baseline-lift">正答数</div></th>
                            <th style="font-size: 8.5pt; font-weight: 600; text-align: center;"><div class="baseline-lift">判定</div></th>
                            <th style="font-size: 8.5pt; font-weight: 600; text-align: center;"><div class="baseline-lift">評価</div></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subjectRows}
                    </tbody>
                </table>

                ${detailsHtml ? `
                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        <h3 style="font-size: 10pt; font-weight: bold; color: #1e293b; margin-bottom: 12px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; display: inline-block;">
                            <div class="baseline-lift" style="top: -1mm;">解答詳細</div>
                        </h3>
                        ${detailsHtml}
                    </div>
                ` : ''}

                <div style="margin-top: 8px; text-align: right; font-size: 7.5pt; color: #94a3b8;">
                    神戸外語教育学院 | 発行日: ${today}
                </div>
            ` : `
                <div style="width: 100%; margin-bottom: 12mm; border-bottom: 2px solid #000; padding-bottom: 8mm;">
                    <div style="text-align: right; font-size: 10pt; margin-bottom: 5mm; width: 100%;">発行日：${today}</div>
                    <h1 style="text-align: center; font-size: 24pt; font-weight: bold; letter-spacing: 5px; width: 100%; margin: 0 auto;">${isExam ? '期末試験結果通知' : '成績通知表'}</h1>
                </div>

                <table class="pdf-table" style="margin-bottom: 15mm; table-layout: fixed;">
                    <tr>
                        <td align="center" style="background-color: #f5f5f5; width: 15%;"><div class="cell-center">学籍番号</div></td>
                        <td align="center" style="width: 35%; font-weight: bold;"><div class="cell-center">${student.student_id_text}</div></td>
                        <td align="center" style="background-color: #f5f5f5; width: 15%;"><div class="cell-center">氏　名</div></td>
                        <td align="center" style="width: 35%; font-weight: bold; font-size: ${nameFontSize};"><div class="cell-center">${student.student_name}</div></td>
                    </tr>
                    <tr>
                        <td align="center" style="background-color: #f5f5f5;"><div class="cell-center">クラス</div></td>
                        <td align="center" style="font-weight: bold;"><div class="cell-center">${student.class_name}</div></td>
                        <td align="center" style="background-color: #f5f5f5;"><div class="cell-center">学　期</div></td>
                        <td align="center" style="font-weight: bold;"><div class="cell-center">${yearTerm || ''}</div></td>
                    </tr>
                </table>

                <table class="pdf-table" style="margin-bottom: 8mm; table-layout: fixed; border-width: 2px;">
                    <thead>
                        <tr style="background: #f0f0f0;">
                            ${isExam ? `
                                <th style="width: 35%; text-align: left;">科目</th>
                                <th style="width: 20%;">満点</th>
                                <th style="width: 20%;">得点</th>
                                <th style="width: 25%;">評価</th>
                            ` : `
                                <th style="width: 25%; text-align: left;">科目</th>
                                <th style="width: 15%;">基礎点</th>
                                <th style="width: 15%;">出席点</th>
                                <th style="width: 15%;">平常点</th>
                                <th style="width: 15%;">合計</th>
                                <th style="width: 15%;">評定</th>
                            `}
                        </tr>
                    </thead>
                    <tbody>
                        ${subjectRows}
                    </tbody>
                </table>

                <div style="border: 1px solid #000; padding: 4mm; display: flex; justify-content: space-around; align-items: center; margin-top: 5mm; height: 35mm;">
                    <div style="text-align: center; width: 45%;">
                        <div style="font-size: 11pt; margin-bottom: 3mm;">${isExam ? '期末試験合計' : '成績合計点'}</div>
                        <div style="font-size: 20pt; font-weight: bold;">${isExam ? student.final_exam_total : (student.report_card_total?.toFixed(1) || '0.0')} <span style="font-size: 11pt; font-weight: normal;">/ ${isExam ? '600' : '100'}</span></div>
                    </div>
                    <div style="text-align: center; border: 1.5px solid #000; width: 30mm; height: 30mm; background: #fff; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <div class="baseline-lift" style="font-size: 10pt; top: -1mm;">${isExam ? '総合判定' : '総合評定'}</div>
                        <div class="baseline-lift" style="font-size: 32pt; font-weight: bold; line-height: 1; top: -3mm;">${calculateGrade(isExam ? (student.final_exam_total / 6) : student.report_card_total)}</div>
                    </div>
                </div>

                <div style="margin-top: 20mm; text-align: right;">
                    <div style="font-size: 16pt; font-weight: bold;">神戸外語教育学院</div>
                </div>
            `}
        </div>
    `;

    container.innerHTML = contentHtml;
    document.body.appendChild(container);

    try {
        if (typeof window !== 'undefined') window.scrollTo(0, 0);
        if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready;
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;
        const canvas = await html2canvas(container, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        return pdf.output('blob');
    } finally {
        document.body.removeChild(container);
    }
}

/**
 * Generates a transcript/certificate PDF on the client side.
 * @param {Object} data - Student info and grades.
 * @param {string} issueDate - Release date string.
 * @returns {Promise<Blob>}
 */
export async function generateCertificatePDFClient(data, issueDate) {
    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    const nameLength = (data.name || '').length;
    let nameFontSize = '14pt';
    if (nameLength > 30) nameFontSize = '9pt';
    else if (nameLength > 22) nameFontSize = '11pt';
    else if (nameLength > 15) nameFontSize = '12.5pt';

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    container.style.backgroundColor = 'white';
    container.style.color = '#000';
    container.style.boxSizing = 'border-box';

    const grades = data.grades || {};
    const subjects = ['文字語彙', '文法', '読解', '聴解', '作文', '会話', '総合'];
    const gradeLetters = ['A', 'B', 'C', 'D', 'F'];

    const gradeRows = subjects.map(subject => {
        const selectedGrade = grades[subject] || '';
        const gradeCells = gradeLetters.map(letter => {
            const isSelected = selectedGrade === letter;
            return `<td style="border: 1px solid #000; padding: 4px; text-align: center; width: 14%;"><div class="baseline-lift" style="top: -0.5mm;">${isSelected ? `<span style="border: 2px solid #000; border-radius: 50%; width: 25px; height: 25px; display: inline-block; line-height: 22px; font-weight: bold;">${letter}</span>` : letter}</div></td>`;
        }).join('');
        return `<tr><td style="border: 1px solid #000; padding: 4px; text-align: center; width: 16%; font-weight: bold; background: #f5f5f5;"><div class="baseline-lift" style="top: -0.5mm;">${subject}</div></td>${gradeCells}</tr>`;
    }).join('');

    container.innerHTML = `
        <style>
            .pdf-page {
                width: 210mm;
                padding: 15mm 20mm;
                background: white;
                font-family: "Noto Serif JP", "Yu Mincho", serif;
                font-size: 10pt;
                line-height: 1.3;
                color: #000;
                box-sizing: border-box;
            }
            .pdf-page * { box-sizing: border-box; margin: 0; padding: 0; }
            .baseline-lift {
                position: relative;
                top: -1.2mm;
            }
        </style>
    <div class="pdf-page">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 24pt; font-weight: bold; border-bottom: 3px double #000; display: inline-block; padding: 0 10mm; margin-top: 10mm;">成 績 証 明 書</h1>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 12px; font-size: 10pt;">
            <tr>
                <td style="border: 1px solid #000; padding: 6px; width: 15%; text-align: center; background: #f5f5f5;">学籍番号</td>
                <td style="border: 1px solid #000; padding: 6px; width: 35%; font-weight: bold;">${data.studentId || ''}</td>
                <td style="border: 1px solid #000; padding: 6px; width: 15%; text-align: center; background: #f5f5f5;">クラス</td>
                <td style="border: 1px solid #000; padding: 6px; width: 35%; font-weight: bold;">${data.className || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f5f5f5;">国　籍</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${data.nationality || ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f5f5f5;">氏　名</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: ${nameFontSize};">${data.name || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f5f5f5;">生年月日</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${data.birthDate || ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f5f5f5;">性　別</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${data.gender || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f5f5f5;">入学年月日</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold;" colspan="3">${data.enrollmentDate || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f5f5f5;">卒業年月日</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold;" colspan="3">
                    ${data.graduationDate || ''} （
                    ${data.graduationStatus === 'graduated' ? '<span style="border: 1.5px solid #000; border-radius: 12px; padding: 0 6px;">卒業</span>' : '卒業'}・
                    ${data.graduationStatus === 'expected' ? '<span style="border: 1.5px solid #000; border-radius: 12px; padding: 0 6px;">卒業見込み</span>' : '卒業見込み'}
                    ）
                </td>
            </tr>
        </table>

        <p style="margin: 12px 0; font-size: 11pt; text-indent: 1em;">上記の者の成績は下記の通りであることを証明致します。</p>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 8px;">
            <thead>
                <tr style="background: #e0e0e0;">
                    <th style="border: 1px solid #000; padding: 6px; font-weight: bold;">科　　目</th>
                    <th style="border: 1px solid #000; padding: 6px; font-weight: bold;" colspan="5">評　　価</th>
                </tr>
            </thead>
            <tbody>
                ${gradeRows}
                <tr style="background: #f5f5f5;">
                    <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;" colspan="6">特 記 事 項</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 12mm 10px; text-align: left; vertical-align: top; height: 35mm;" colspan="6">${data.specialNotes || ''}</td>
                </tr>
            </tbody>
        </table>

        <div style="font-size: 9pt; margin-top: 5mm; border: 1px solid #000; padding: 3mm;">
            <div style="font-weight: bold;">＊評価基準　Ａ・Ｂ・Ｃ・Ｄ・Ｆの5段階</div>
            <div style="margin-top: 1mm;">
                A [100〜80] / B [79〜70] / C [69〜60] / D [59〜50] / F [49以下]
            </div>
        </div>

        <div style="text-align: right; margin-top: 20mm;">
            <div style="font-size: 12pt; margin-bottom: 6mm;">${issueDate || today}</div>
            <div style="font-size: 18pt; font-weight: bold; letter-spacing: 2px;">神戸外語教育学院</div>
            <div style="font-size: 10pt; color: #333; margin-top: 2mm;">Kobe Foreign Language Education Institute</div>
        </div>
    </div>
`;

    document.body.appendChild(container);

    try {
        if (document.fonts) await document.fonts.ready;
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;
        const canvas = await html2canvas(container, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        return pdf.output('blob');
    } finally {
        document.body.removeChild(container);
    }
}
