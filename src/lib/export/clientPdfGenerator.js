/**
 * Generates an attendance PDF on the client side.
 * @param {Object} data - The same data structure used for student stats and history.
 * @returns {Promise<Blob>}
 */
export async function generateAttendancePDFClient(data) {
    const { student, history } = data;
    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.padding = '15mm 20mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = '"Noto Sans JP", sans-serif';
    container.style.color = '#333';

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
                <td style="border: 1px solid #999; padding: 4px; text-align: center;">${row.year}年${row.month}月</td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center;">${row.class_days}</td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center;">${row.attendance_days}</td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center;">${row.absence_days}</td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center;">${row.late_slots !== undefined ? row.late_slots : '-'}</td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center; ${getRateStyle(cRate)}">${cRate !== undefined ? (cRate * 100).toFixed(1) + '%' : '-'}</td>
                <td style="border: 1px solid #999; padding: 4px; text-align: center; ${getRateStyle(mRate)}">${mRate !== undefined ? (mRate * 100).toFixed(1) + '%' : '-'}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div style="text-align: right; font-size: 10pt; margin-bottom: 2mm;">発行日：${today}</div>
        <div style="text-align: center; margin-bottom: 2mm;">
            <h1 style="font-size: 26pt; font-weight: bold; margin: 0; color: #333; letter-spacing: 2px;">神戸外語教育学院</h1>
        </div>
        <div style="position: relative; height: 32mm; border-bottom: 2px solid #333; margin-bottom: 3mm;">
            <div style="position: absolute; bottom: 1mm; left: 0;">
                <div style="font-weight: bold; font-size: 11pt; margin-bottom: 2px;">学籍番号：${student.id}</div>
                <div style="font-weight: bold; font-size: 14pt; margin-bottom: 3px;">名前：${student.name}</div>
                <div style="font-weight: bold; font-size: 11pt;">クラス：${student.className || ''}</div>
            </div>
            <div style="position: absolute; bottom: 1mm; right: 0; width: 60mm; height: 26mm; border: 2px solid #333; border-radius: 8px; background: #fff; overflow: hidden;">
                <div style="height: 8mm; background-color: #f5f5f5; border-bottom: 1px solid #333; font-size: 8pt; display: flex; align-items: center; justify-content: center; text-align: center; color: #555;">
                    ${latestData.year}年${latestData.month}月出席率
                </div>
                <div style="height: 18mm; display: flex; align-items: center; justify-content: center; font-size: 22pt; font-weight: bold; ${rateClass}">
                    ${latestRatePercent}%
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
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;
        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
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
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.padding = '25mm 20mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = '"Noto Serif JP", serif';
    container.style.color = '#000';
    container.style.lineHeight = '1.5';

    let contentHtml = '';

    if (isJlpt) {
        // JLPT Mock Exam Results Design
        const finalExam = student.final_exam_data || {};
        const totalScore = student.final_exam_total || 0;
        const result = finalExam.result === '合' || finalExam.result === '○' ? '合格' : '不合格';
        const resultColor = result === '合格' ? '#10b981' : '#ef4444';

        contentHtml = `
            <div style="position: relative; margin-bottom: 10mm; height: 25mm; border-bottom: 2px solid #000;">
                <div style="position: absolute; top: -10mm; right: 0; font-size: 10pt;">発行日：${today}</div>
                <h1 style="text-align: center; font-size: 22pt; font-weight: bold; letter-spacing: 5px; margin-top: 5mm;">JLPT模擬試験 結果通知</h1>
            </div>

            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 8mm;">
                <tr>
                    <td style="background-color: #f5f5f5; text-align: center; width: 15%; padding: 5px 10px; border: 1px solid #000;">学籍番号</td>
                    <td style="width: 35%; padding: 5px 10px; border: 1px solid #000; font-weight: bold;">${student.student_id_text}</td>
                    <td style="background-color: #f5f5f5; text-align: center; width: 15%; padding: 5px 10px; border: 1px solid #000;">氏　名</td>
                    <td style="width: 35%; padding: 5px 10px; border: 1px solid #000; font-weight: bold; font-size: 13pt;">${student.student_name}</td>
                </tr>
                <tr>
                    <td style="background-color: #f5f5f5; text-align: center; padding: 5px 10px; border: 1px solid #000;">クラス</td>
                    <td style="padding: 5px 10px; border: 1px solid #000; font-weight: bold;">${student.class_name}</td>
                    <td style="background-color: #f5f5f5; text-align: center; padding: 5px 10px; border: 1px solid #000;">学　期</td>
                    <td style="padding: 5px 10px; border: 1px solid #000; font-weight: bold;">${yearTerm || ''}</td>
                </tr>
            </table>

            <div style="border: 1px solid #000; padding: 6mm 4mm; display: flex; justify-content: space-around; align-items: center; margin-top: 5mm; height: 38mm; background-color: #fcfcfc;">
                <div style="text-align: center; width: 45%; height: 28mm; display: flex; flex-direction: column; justify-content: center; border: 1px solid #000; background-color: #fff;">
                    <div style="font-size: 11pt; color: #666; margin-bottom: 2mm;">総合得点</div>
                    <div style="font-size: 24pt; font-weight: bold;">${totalScore} <span style="font-size: 12pt; font-weight: normal;">/ 180</span></div>
                </div>
                <div style="text-align: center; width: 45%; height: 28mm; display: flex; flex-direction: column; justify-content: center; border: 2px solid ${resultColor}; background-color: ${result === '合格' ? '#f0fdf4' : '#fef2f2'};">
                    <div style="font-size: 11pt; color: #666; margin-bottom: 2mm;">判定</div>
                    <div style="font-size: 24pt; font-weight: bold; color: ${resultColor};">${result}</div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 10mm;">
                <thead>
                    <tr style="background: #f0f0f0;">
                        <th style="border: 1px solid #000; padding: 10px; text-align: left;">得点区分</th>
                        <th style="border: 1px solid #000; padding: 10px; text-align: center;">得点</th>
                        <th style="border: 1px solid #000; padding: 10px; text-align: center;">判定</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #000; padding: 12px;">言語知識（文字・語彙・文法）</td>
                        <td style="border: 1px solid #000; padding: 12px; text-align: center; font-weight: bold;">${(finalExam.vocab || 0) + (finalExam.grammar || 0)} / 60</td>
                        <td style="border: 1px solid #000; padding: 12px; text-align: center;">${finalExam.judgments?.[0] || '-'}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 12px;">読解</td>
                        <td style="border: 1px solid #000; padding: 12px; text-align: center; font-weight: bold;">${finalExam.reading || 0} / 60</td>
                        <td style="border: 1px solid #000; padding: 12px; text-align: center;">${finalExam.judgments?.[1] || '-'}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 12px;">聴解</td>
                        <td style="border: 1px solid #000; padding: 12px; text-align: center; font-weight: bold;">${finalExam.listening || 0} / 60</td>
                        <td style="border: 1px solid #000; padding: 12px; text-align: center;">${finalExam.judgments?.[2] || '-'}</td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top: 20mm; text-align: right;">
                <div style="font-size: 16pt; font-weight: bold;">神戸外語教育学院</div>
            </div>
        `;
    } else {
        // Standard Grade Report Design
        const isExam = type === 'final_exam';
        const subjects = ['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'];
        const subjectNames = { 'vocab': '文字・語彙', 'grammar': '文法', 'reading': '読解', 'listening': '聴解', 'writing': '作文', 'conversation': '会話' };

        let reportData = student.report_card_data || {};
        let subjectRows = '';

        if (isExam) {
            subjectRows = subjects.map(key => `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${subjectNames[key]}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">100</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${student.final_exam_data?.[key] || '-'}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${calculateGrade(student.final_exam_data?.[key])}</td>
                </tr>
            `).join('');
        } else {
            const att = reportData.attendance;
            const part = reportData.participation;
            subjectRows = subjects.map(key => {
                const d = reportData[key] || {};
                return `
                    <tr>
                        <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${subjectNames[key]}</td>
                        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${d.base !== undefined ? d.base.toFixed(1) : '-'}</td>
                        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${att !== undefined ? att.toFixed(1) : '-'}</td>
                        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${part !== undefined ? part.toFixed(1) : '-'}</td>
                        <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${d.total !== undefined ? d.total.toFixed(1) : '-'}</td>
                        <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${d.total !== undefined ? calculateGrade(d.total) : '-'}</td>
                    </tr>
                `;
            }).join('');
        }

        contentHtml = `
            <div style="position: relative; margin-bottom: 10mm; height: 25mm; border-bottom: 2px solid #000;">
                <div style="position: absolute; top: -10mm; right: 0; font-size: 10pt;">発行日：${today}</div>
                <h1 style="text-align: center; font-size: 22pt; font-weight: bold; letter-spacing: 5px; margin-top: 5mm;">${isExam ? '期末試験結果通知' : '成績通知表'}</h1>
            </div>

            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 8mm;">
                <tr>
                    <td style="background-color: #f5f5f5; text-align: center; width: 15%; padding: 5px 10px; border: 1px solid #000;">学籍番号</td>
                    <td style="width: 35%; padding: 5px 10px; border: 1px solid #000; font-weight: bold;">${student.student_id_text}</td>
                    <td style="background-color: #f5f5f5; text-align: center; width: 15%; padding: 5px 10px; border: 1px solid #000;">氏　名</td>
                    <td style="width: 35%; padding: 5px 10px; border: 1px solid #000; font-weight: bold; font-size: 13pt;">${student.student_name}</td>
                </tr>
                <tr>
                    <td style="background-color: #f5f5f5; text-align: center; padding: 5px 10px; border: 1px solid #000;">クラス</td>
                    <td style="padding: 5px 10px; border: 1px solid #000; font-weight: bold;">${student.class_name}</td>
                    <td style="background-color: #f5f5f5; text-align: center; padding: 5px 10px; border: 1px solid #000;">学　期</td>
                    <td style="padding: 5px 10px; border: 1px solid #000; font-weight: bold;">${yearTerm || ''}</td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 8mm;">
                <thead>
                    <tr style="background: #f0f0f0;">
                        ${isExam ? `
                            <th style="border: 1px solid #000; padding: 8px;">科目</th>
                            <th style="border: 1px solid #000; padding: 8px;">満点</th>
                            <th style="border: 1px solid #000; padding: 8px;">得点</th>
                            <th style="border: 1px solid #000; padding: 8px;">評価</th>
                        ` : `
                            <th style="border: 1px solid #000; padding: 10px;">科目</th>
                            <th style="border: 1px solid #000; padding: 10px;">基礎点</th>
                            <th style="border: 1px solid #000; padding: 10px;">出席点</th>
                            <th style="border: 1px solid #000; padding: 10px;">平常点</th>
                            <th style="border: 1px solid #000; padding: 10px;">合計</th>
                            <th style="border: 1px solid #000; padding: 10px;">評定</th>
                        `}
                    </tr>
                </thead>
                <tbody>
                    ${subjectRows}
                </tbody>
            </table>

            <div style="border: 1px solid #000; padding: 6mm 4mm; display: flex; justify-content: space-around; align-items: center; margin-top: 5mm; height: 38mm; background-color: #fcfcfc;">
                <div style="text-align: center; width: 45%; height: 28mm; border: 1px solid #ccc; background: #fff; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 11pt; margin-bottom: 2mm;">${isExam ? '期末試験合計' : '成績合計点'}</div>
                    <div style="font-size: 18pt; font-weight: bold;">${isExam ? student.final_exam_total : (student.report_card_total?.toFixed(1) || '0.0')} <span style="font-size: 10pt; font-weight: normal;">/ ${isExam ? '600' : '100'}</span></div>
                </div>
                <div style="text-align: center; border: 2px solid #000; width: 45%; height: 28mm; display: flex; flex-direction: column; justify-content: center; background: #fff;">
                    <div style="font-size: 11pt; margin-bottom: 1mm;">${isExam ? '総合判定' : '総合評定'}</div>
                    <div style="font-size: 28pt; font-weight: bold; line-height: 1;">${calculateGrade(isExam ? (student.final_exam_total / 6) : student.report_card_total)}</div>
                </div>
            </div>
            <div style="margin-top: 20mm; text-align: right;">
                <div style="font-size: 16pt; font-weight: bold;">神戸外語教育学院</div>
            </div>
        `;
    }

    container.innerHTML = contentHtml;
    document.body.appendChild(container);

    try {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;
        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
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

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.padding = '18mm 20mm 18mm 20mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = '"Noto Serif JP", "Yu Mincho", serif';
    container.style.fontSize = '10pt';
    container.style.lineHeight = '1.3';
    container.style.color = '#000';

    const grades = data.grades || {};
    const subjects = ['文字語彙', '文法', '読解', '聴解', '作文', '会話', '総合'];
    const gradeLetters = ['A', 'B', 'C', 'D', 'F'];

    const gradeRows = subjects.map(subject => {
        const selectedGrade = grades[subject] || '';
        const gradeCells = gradeLetters.map(letter => {
            const isSelected = selectedGrade === letter;
            return `<td style="border: 1px solid #000; padding: 4px; text-align: center; width: 14%;">${isSelected ? `<span style="border: 2px solid #000; border-radius: 50%; width: 25px; height: 25px; display: inline-block; line-height: 22px; font-weight: bold;">${letter}</span>` : letter}</td>`;
        }).join('');
        return `<tr><td style="border: 1px solid #000; padding: 4px; text-align: center; width: 16%; font-weight: bold; background: #f5f5f5;">${subject}</td>${gradeCells}</tr>`;
    }).join('');

    container.innerHTML = `
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
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 14pt;">${data.name || ''}</td>
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
    `;

    document.body.appendChild(container);

    try {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;
        const canvas = await html2canvas(container, { scale: 2.5, useCORS: true });
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
