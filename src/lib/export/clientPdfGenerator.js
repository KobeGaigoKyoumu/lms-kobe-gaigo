/**
 * Generates an attendance PDF on the client side.
 * @param {Object} data - The same data structure used for server-side PDF.
 * @returns {Promise<Blob>}
 */
export async function generateAttendancePDFClient(data) {
    const { student, history, currentStats } = data;

    // Create a temporary hidden div to render the HTML
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width
    container.style.padding = '15mm 20mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = '"Noto Sans JP", "Inter", sans-serif';
    container.style.color = '#1f2937';

    // UI Colors mapping
    const getRateColorHex = (rate) => {
        const r = parseFloat(rate);
        if (r < 0.8) return '#dc2626'; // danger
        if (r < 0.9) return '#f59e0b'; // warning
        return '#059669'; // success
    };

    const rateColor = getRateColorHex(currentStats.rate);

    container.innerHTML = `
        <div style="text-align: right; font-size: 9pt; color: #6b7280; margin-bottom: 5mm;">発行日：${new Date().toLocaleDateString('ja-JP')}</div>
        
        <div style="margin-bottom: 10mm; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <h1 style="font-size: 24pt; font-weight: 800; margin: 0; color: #111827; letter-spacing: -0.025em;">神戸外語教育学院</h1>
                <p style="font-size: 10pt; color: #6b7280; margin: 2mm 0 0 0;">Kobe Foreign Language Education Institute</p>
            </div>
            <div style="text-align: right;">
                <h2 style="font-size: 18pt; font-weight: 700; margin: 0; color: #3b82f6;">出席状況証明書</h2>
                <p style="font-size: 9pt; color: #6b7280; margin: 1mm 0 0 0;">Attendance Certificate</p>
            </div>
        </div>

        <div style="display: flex; gap: 5mm; margin-bottom: 8mm;">
            <div style="flex: 1; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 5mm;">
                <div style="font-size: 8pt; color: #6b7280; margin-bottom: 1mm;">学籍番号 / Student ID</div>
                <div style="font-size: 11pt; font-weight: 600;">${student.id}</div>
                <div style="height: 3mm;"></div>
                <div style="font-size: 8pt; color: #6b7280; margin-bottom: 1mm;">氏名 / Name</div>
                <div style="font-size: 14pt; font-weight: 700;">${student.name} 様</div>
                <div style="height: 3mm;"></div>
                <div style="font-size: 8pt; color: #6b7280; margin-bottom: 1mm;">クラス / Class</div>
                <div style="font-size: 11pt; font-weight: 600;">${student.className || '-'}</div>
            </div>
            <div style="width: 60mm; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 12px; padding: 5mm; text-align: center; display: flex; flex-direction: column; justify-content: center;">
                <div style="font-size: 9pt; color: #0369a1; font-weight: 600; margin-bottom: 2mm;">現在の出席率 / Attendance Rate</div>
                <div style="font-size: 28pt; font-weight: 800; color: ${rateColor}; line-height: 1;">
                    ${(currentStats.rate * 100).toFixed(1)}<span style="font-size: 14pt;">%</span>
                </div>
            </div>
        </div>

        <h3 style="font-size: 11pt; font-weight: 700; color: #374151; margin-bottom: 3mm; border-left: 4px solid #3b82f6; padding-left: 3mm;">月別出席状況 / Monthly History</h3>
        
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 9pt; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <thead>
                <tr style="background-color: #f3f4f6;">
                    <th style="padding: 3mm; text-align: center; border-bottom: 1px solid #e5e7eb; font-weight: 600;">年月</th>
                    <th style="padding: 3mm; text-align: center; border-bottom: 1px solid #e5e7eb; font-weight: 600;">授業日数</th>
                    <th style="padding: 3mm; text-align: center; border-bottom: 1px solid #e5e7eb; font-weight: 600;">出席日数</th>
                    <th style="padding: 3mm; text-align: center; border-bottom: 1px solid #e5e7eb; font-weight: 600;">欠席日数</th>
                    <th style="padding: 3mm; text-align: center; border-bottom: 1px solid #e5e7eb; font-weight: 600;">月間出席率</th>
                    <th style="padding: 3mm; text-align: center; border-bottom: 1px solid #e5e7eb; font-weight: 600;">累計出席率</th>
                </tr>
            </thead>
            <tbody>
                ${history.monthlyData.map((row, idx) => {
        const cumulative = history.cumulativeData.find(c => c.year === row.year && c.month === row.month);
        const isLast = idx === history.monthlyData.length - 1;
        return `
                    <tr style="${isLast ? '' : 'border-bottom: 1px solid #f3f4f6;'}">
                        <td style="padding: 3mm; text-align: center; border-bottom: ${isLast ? 'none' : '1px solid #e5e7eb'};">${row.year}年${row.month}月</td>
                        <td style="padding: 3mm; text-align: center; border-bottom: ${isLast ? 'none' : '1px solid #e5e7eb'};">${(row.attendance_days || 0) + (row.absence_days || 0)}回</td>
                        <td style="padding: 3mm; text-align: center; border-bottom: ${isLast ? 'none' : '1px solid #e5e7eb'};">${row.attendance_days}</td>
                        <td style="padding: 3mm; text-align: center; border-bottom: ${isLast ? 'none' : '1px solid #e5e7eb'}; color: ${row.absence_days > 0 ? '#dc2626' : 'inherit'};">${row.absence_days}</td>
                        <td style="padding: 3mm; text-align: center; border-bottom: ${isLast ? 'none' : '1px solid #e5e7eb'}; font-weight: 600; color: ${getRateColorHex(row.attendance_rate)};">${(row.attendance_rate * 100).toFixed(1)}%</td>
                        <td style="padding: 3mm; text-align: center; border-bottom: ${isLast ? 'none' : '1px solid #e5e7eb'}; font-weight: 700; background-color: #f9fafb;">${(cumulative?.attendance_rate * 100).toFixed(1)}%</td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>

        <div style="margin-top: 15mm; border-top: 1px solid #e5e7eb; padding-top: 5mm; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 8pt; color: #9ca3af;">
                ※ 本証明書はシステムにより自動生成されたものです。<br>
                ※ 出席率は「出席日数 / 授業日数」により算出されています。
            </div>
            <div style="text-align: right;">
                <div style="font-size: 10pt; font-weight: 600; color: #374145;">神戸外語教育学院 事務局</div>
                <div style="font-size: 8pt; color: #6b7280; margin-top: 1mm;">〒650-0022 神戸市中央区元町通2-9-1</div>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    try {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;

        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
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

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.padding = '15mm 20mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = '"Noto Sans JP", "Inter", sans-serif';
    container.style.color = '#1f2937';

    let contentHtml = '';

    if (isJlpt) {
        // JLPT Template
        contentHtml = `
            <div style="text-align: right; font-size: 9pt; color: #6b7280; margin-bottom: 5mm;">発行日：${new Date().toLocaleDateString('ja-JP')}</div>
            
            <div style="text-align: center; margin-bottom: 10mm;">
                <h1 style="font-size: 22pt; font-weight: 800; color: #111827; margin: 0;">JLPT模擬試験 結果通知</h1>
                <div style="display: inline-block; background: #3b82f6; color: white; padding: 1mm 4mm; border-radius: 4px; font-size: 12pt; font-weight: 600; margin-top: 3mm;">
                    ${yearTerm}
                </div>
            </div>

            <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 6mm; border-radius: 12px; margin-bottom: 8mm;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <div style="font-size: 8pt; color: #6b7280; margin-bottom: 1mm;">学籍番号 / Student ID</div>
                        <div style="font-size: 11pt; font-weight: 600; color: #4b5563;">${student.student_id_text}</div>
                        <div style="height: 3mm;"></div>
                        <div style="font-size: 8pt; color: #6b7280; margin-bottom: 1mm;">氏名 / Name</div>
                        <div style="font-size: 18pt; font-weight: 700; color: #111827;">${student.student_name} 様</div>
                    </div>
                    <div style="text-align: center; min-width: 45mm; background: white; border: 2px solid #3b82f6; border-radius: 8px; overflow: hidden;">
                        <div style="background: #3b82f6; color: white; padding: 1mm; font-size: 9pt; font-weight: 600;">判定 / Result</div>
                        <div style="font-size: 24pt; font-weight: 800; padding: 2mm; color: ${student.final_exam_data?.result === '合' || student.final_exam_data?.result === '○' ? '#059669' : '#dc2626'};">
                            ${student.final_exam_data?.result === '合' || student.final_exam_data?.result === '○' ? '合格' : '不合格'}
                        </div>
                    </div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="border-bottom: 2px solid #e5e7eb; padding: 4mm; text-align: left; font-weight: 700;">得点区分 / Section</th>
                        <th style="border-bottom: 2px solid #e5e7eb; padding: 4mm; text-align: center; font-weight: 700; width: 30mm;">得点 / Score</th>
                        <th style="border-bottom: 2px solid #e5e7eb; padding: 4mm; text-align: center; font-weight: 700; width: 30mm;">評価 / Eval</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border-bottom: 1px solid #e5e7eb; padding: 4mm; font-weight: 600;">言語知識 (語彙・文法)</td>
                        <td style="border-bottom: 1px solid #e5e7eb; padding: 4mm; text-align: center; font-size: 11pt;">${(student.final_exam_data?.vocab || 0) + (student.final_exam_data?.grammar || 0)} <span style="font-size: 8pt; color: #6b7280;">/ 60</span></td>
                        <td style="border-bottom: 1px solid #e5e7eb; padding: 4mm; text-align: center;">-</td>
                    </tr>
                    <tr>
                        <td style="border-bottom: 1px solid #e5e7eb; padding: 4mm; font-weight: 600;">読解</td>
                        <td style="border-bottom: 1px solid #e5e7eb; padding: 4mm; text-align: center; font-size: 11pt;">${student.final_exam_data?.reading || 0} <span style="font-size: 8pt; color: #6b7280;">/ 60</span></td>
                        <td style="border-bottom: 1px solid #e5e7eb; padding: 4mm; text-align: center; font-weight: 600; color: #3b82f6;">${student.final_exam_data?.readingEval || '-'}</td>
                    </tr>
                    <tr>
                        <td style="border-bottom: 1px solid #e5e7eb; padding: 4mm; font-weight: 600;">聴解</td>
                        <td style="border-bottom: 1px solid #e5e7eb; padding: 4mm; text-align: center; font-size: 11pt;">${student.final_exam_data?.listening || 0} <span style="font-size: 8pt; color: #6b7280;">/ 60</span></td>
                        <td style="border-bottom: 1px solid #e5e7eb; padding: 4mm; text-align: center; font-weight: 600; color: #3b82f6;">${student.final_exam_data?.listeningEval || '-'}</td>
                    </tr>
                    <tr style="background: #f9fafb;">
                        <td style="padding: 5mm; font-weight: 800; font-size: 12pt;">総合得点 / Total Score</td>
                        <td style="padding: 5mm; text-align: center; font-size: 16pt; font-weight: 800; color: #3b82f6;">${student.final_exam_total} <span style="font-size: 10pt; color: #6b7280;">/ 180</span></td>
                        <td style="padding: 5mm; text-align: center;">-</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top: 15mm; display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="font-size: 8pt; color: #9ca3af; line-height: 1.6;">
                    ※ 本成績通知は模擬試験の結果を示すものであり、本試験の合否を保証するものではありません。<br>
                    ※ 判定基準：N1/100点, N2/90点, N3/95点（模試独自基準）
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11pt; font-weight: 700; color: #111827;">神戸外語教育学院</div>
                    <div style="font-size: 8pt; color: #6b7280; margin-top: 1mm;">Kobe Foreign Language Education Institute</div>
                </div>
            </div>
        `;
    } else {
        // Standard Grade Report / Exam Template
        const isExam = type === 'final_exam';
        contentHtml = `
            <div style="text-align: right; font-size: 9pt; color: #6b7280; margin-bottom: 5mm;">発行日：${new Date().toLocaleDateString('ja-JP')}</div>
            
            <div style="text-align: center; margin-bottom: 10mm;">
                <h1 style="font-size: 22pt; font-weight: 800; color: #111827; margin: 0;">${isExam ? '期末試験 結果通知表' : '成績通知表'}</h1>
                <div style="font-size: 12pt; color: #6b7280; margin-top: 2mm; font-weight: 600;">${yearTerm || ''}</div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; border-bottom: 2px solid #f3f4f6; padding-bottom: 5mm;">
                <div>
                    <div style="font-size: 8pt; color: #6b7280; margin-bottom: 1mm;">学籍番号 / ID: ${student.student_id_text}</div>
                    <div style="font-size: 16pt; font-weight: 700; color: #111827;">${student.student_name} 様</div>
                    <div style="font-size: 10pt; color: #4b5563; margin-top: 2mm;">クラス: ${student.class_name}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12pt; font-weight: 700; color: #111827;">神戸外語教育学院</div>
                    <div style="font-size: 8pt; color: #6b7280; margin-top: 1mm;">Exam Results / Grade Report</div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="padding: 4mm; text-align: left; font-weight: 700; border-bottom: 2px solid #e5e7eb;">科目 / Subject</th>
                        <th style="padding: 4mm; text-align: center; font-weight: 700; border-bottom: 2px solid #e5e7eb; width: 40mm;">得点 / Score</th>
                        <th style="padding: 4mm; text-align: center; font-weight: 700; border-bottom: 2px solid #e5e7eb; width: 40mm;">評価 / Grade</th>
                    </tr>
                </thead>
                <tbody>
                    ${isExam ? `
                        <tr><td style="padding: 3.5mm 4mm; border-bottom: 1px solid #f3f4f6; font-weight: 600;">文字・語彙</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6;">${student.final_exam_data?.vocab || 0}</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6; color: #9ca3af;">-</td></tr>
                        <tr><td style="padding: 3.5mm 4mm; border-bottom: 1px solid #f3f4f6; font-weight: 600;">聴解</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6;">${student.final_exam_data?.listening || 0}</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6; color: #9ca3af;">-</td></tr>
                        <tr><td style="padding: 3.5mm 4mm; border-bottom: 1px solid #f3f4f6; font-weight: 600;">読解</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6;">${student.final_exam_data?.reading || 0}</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6; color: #9ca3af;">-</td></tr>
                        <tr><td style="padding: 3.5mm 4mm; border-bottom: 1px solid #f3f4f6; font-weight: 600;">文法</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6;">${student.final_exam_data?.grammar || 0}</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6; color: #9ca3af;">-</td></tr>
                        <tr><td style="padding: 3.5mm 4mm; border-bottom: 1px solid #f3f4f6; font-weight: 600;">作文</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6;">${student.final_exam_data?.writing || 0}</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6; color: #9ca3af;">-</td></tr>
                        <tr><td style="padding: 3.5mm 4mm; border-bottom: 1px solid #f3f4f6; font-weight: 600;">会話</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6;">${student.final_exam_data?.conversation || 0}</td><td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6; color: #9ca3af;">-</td></tr>
                        <tr style="background: #f9fafb; font-weight: 800;">
                            <td style="padding: 5mm 4mm; font-size: 11pt;">合計得点 / Total</td>
                            <td style="padding: 5mm 4mm; text-align: center; font-size: 14pt; color: #3b82f6;">${student.final_exam_total} <span style="font-size: 9pt; color: #9ca3af;">/ 600</span></td>
                            <td style="padding: 5mm 4mm; text-align: center; color: #9ca3af;">-</td>
                        </tr>
                    ` : `
                        ${Object.keys(student.report_card_data || {}).filter(k => !['attendance', 'participation', 'answerDetails', 'subjectCorrectCounts'].includes(k)).map(key => `
                            <tr>
                                <td style="padding: 3.5mm 4mm; border-bottom: 1px solid #f3f4f6; font-weight: 600;">
                                    ${key === 'vocab' ? '文字・語彙' : key === 'listening' ? '聴解' : key === 'reading' ? '読解' : key === 'grammar' ? '文法' : key === 'writing' ? '作文' : key === 'conversation' ? '会話' : key}
                                </td>
                                <td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6;">${student.report_card_data[key].total?.toFixed(1)}</td>
                                <td style="padding: 3.5mm 4mm; text-align: center; border-bottom: 1px solid #f3f4f6; color: #9ca3af;">-</td>
                            </tr>
                        `).join('')}
                        <tr style="background: #f9fafb; font-weight: 800;">
                            <td style="padding: 5mm 4mm; font-size: 11pt;">総合評価 / Overall</td>
                            <td style="padding: 5mm 4mm; text-align: center; font-size: 14pt; color: #3b82f6;">${(student.report_card_total || 0).toFixed(1)}</td>
                            <td style="padding: 5mm 4mm; text-align: center; color: #9ca3af;">-</td>
                        </tr>
                    `}
                </tbody>
            </table>

            <div style="margin-top: 15mm; font-size: 8pt; color: #9ca3af;">
                ※ 本成績通知表はシステムにより自動生成されたものです。<br>
                ※ ご不明な点がございましたら、事務局までお問い合わせください。
            </div>
        `;
    }

    container.innerHTML = contentHtml;
    document.body.appendChild(container);

    try {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;

        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
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
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.padding = '18mm 22mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = '"Noto Serif JP", "serif"';
    container.style.lineHeight = '1.6';
    container.style.color = '#000';

    const grades = data.grades || {};
    const subjects = ['文字語彙', '文法', '読解', '聴解', '作文', '会話', '総合'];
    const gradeLetters = ['A', 'B', 'C', 'D', 'F'];

    const gradeRows = subjects.map(subject => {
        const selectedGrade = grades[subject] || '';
        const gradeCells = gradeLetters.map(letter => {
            const isSelected = selectedGrade === letter;
            return `<td style="border: 1px solid #000; padding: 6px; text-align: center; width: 14%;">${isSelected ? `<div style="border: 1.5px solid #000; border-radius: 50%; width: 28px; height: 28px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-weight: bold;">${letter}</div>` : letter}</td>`;
        }).join('');
        return `<tr><td style="border: 1px solid #000; padding: 6px; text-align: center; width: 20%; font-weight: bold; background: #fbfbfb;">${subject}</td>${gradeCells}</tr>`;
    }).join('');

    container.innerHTML = `
        <div style="border: 4px double #000; padding: 5mm; height: 260mm;">
            <h1 style="text-align: center; font-size: 24pt; font-weight: 700; letter-spacing: 0.5em; margin: 10mm 0 15mm 0;">成績証明書</h1>
            
            <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 10mm; font-size: 10pt;">
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; width: 18%; text-align: center; background: #f0f0f0; font-weight: bold;">学籍番号</td>
                    <td style="border: 1px solid #000; padding: 8px; width: 32%;">${data.studentId || ''}</td>
                    <td style="border: 1px solid #000; padding: 8px; width: 18%; text-align: center; background: #f0f0f0; font-weight: bold;">クラス</td>
                    <td style="border: 1px solid #000; padding: 8px; width: 32%;">${data.className || ''}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold;">国　籍</td>
                    <td style="border: 1px solid #000; padding: 8px;">${data.nationality || ''}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold;">氏　名</td>
                    <td style="border: 1px solid #000; padding: 8px; font-weight: bold; font-size: 13pt;">${data.name || ''}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold;">生年月日</td>
                    <td style="border: 1px solid #000; padding: 8px;">${data.birthDate || ''}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold;">性　別</td>
                    <td style="border: 1px solid #000; padding: 8px;">${data.gender || ''}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold;">入学年月日</td>
                    <td style="border: 1px solid #000; padding: 8px;" colspan="3">${data.enrollmentDate || ''}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold;">卒業年月日</td>
                    <td style="border: 1px solid #000; padding: 8px;" colspan="3">
                        ${data.graduationDate || ''} （ ${data.graduationStatus === 'graduated' ? '<span style="border:1px solid #000; border-radius:12px; padding: 0 6px;">卒業</span>' : '卒業'} ・ ${data.graduationStatus === 'expected' ? '<span style="border:1px solid #000; border-radius:12px; padding: 0 6px;">卒業見込み</span>' : '卒業見込み'} ）
                    </td>
                </tr>
            </table>

            <p style="margin: 10mm 0 8mm 0; font-size: 11pt; text-indent: 1em;">上記の者の成績は下記の通りであることを証明致します。</p>

            <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
                <thead>
                    <tr style="background: #f0f0f0;">
                        <th style="border: 1px solid #000; padding: 8px; font-weight: bold;">科目</th>
                        <th style="border: 1px solid #000; padding: 8px; font-weight: bold;" colspan="5">評　　価</th>
                    </tr>
                </thead>
                <tbody>
                    ${gradeRows}
                    <tr>
                        <td style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold;" colspan="6">特記事項</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 15mm 10px; text-align: left; vertical-align: top; min-height: 40mm;" colspan="6">${data.specialNotes || ''}</td>
                    </tr>
                </tbody>
            </table>

            <div style="font-size: 9pt; margin-top: 10mm; line-height: 1.8;">
                <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block;">＊評価基準　ＡＢＣＤＦの5段階</div><br>
                A 100〜80 / B 79〜70 / C 69〜60 / D 59〜50 / F 49以下
            </div>

            <div style="margin-top: 25mm; text-align: right;">
                <div style="font-size: 12pt;">${issueDate || new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div style="margin-top: 8mm;">
                    <div style="font-size: 16pt; font-weight: bold; margin-bottom: 2mm;">神戸外語教育学院</div>
                    <div style="font-size: 11pt;">理事長　○○ ○○</div>
                    <div style="font-size: 9pt; color: #666; margin-top: 1mm;">Kobe Foreign Language Education Institute</div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    try {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;

        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
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
