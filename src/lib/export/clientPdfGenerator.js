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
    container.style.fontFamily = '"Noto Sans JP", sans-serif';

    // Simple version of the template for now (we can elaborate if needed)
    container.innerHTML = `
        <div style="text-align: right; font-size: 10pt; margin-bottom: 2mm;">発行日：${new Date().toLocaleDateString('ja-JP')}</div>
        <div style="text-align: center; margin-bottom: 2mm;">
            <h1 style="font-size: 26pt; font-weight: bold; margin: 0;">神戸外語教育学院</h1>
        </div>
        <div style="position: relative; height: 30mm; border-bottom: 2px solid #333; margin-bottom: 3mm;">
            <div style="position: absolute; bottom: 1mm; left: 0;">
                <div style="font-weight: bold; font-size: 11pt;">学籍番号：${student.id}</div>
                <div style="font-weight: bold; font-size: 14pt;">名前：${student.name}</div>
                <div style="font-weight: bold; font-size: 11pt;">クラス：${student.className || ''}</div>
            </div>
            <div style="position: absolute; top: 2mm; right: 0; width: 55mm; height: 22mm; border: 2px solid #333; border-radius: 8px; text-align: center;">
                <div style="background-color: #f5f5f5; border-bottom: 1px solid #333; font-size: 8pt; padding: 2px;">出席率</div>
                <div style="font-size: 20pt; font-weight: bold; line-height: 15mm;">${(currentStats.rate * 100).toFixed(1)}%</div>
            </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 3mm; font-size: 9pt;">
            <thead>
                <tr style="background-color: #f0f0f0;">
                    <th style="border: 1px solid #999; padding: 8px;">年月</th>
                    <th style="border: 1px solid #999; padding: 8px;">授業日数</th>
                    <th style="border: 1px solid #999; padding: 8px;">出席日数</th>
                    <th style="border: 1px solid #999; padding: 8px;">欠席日数</th>
                    <th style="border: 1px solid #999; padding: 8px;">遅刻・早退</th>
                    <th style="border: 1px solid #999; padding: 8px;">累計出席率</th>
                    <th style="border: 1px solid #999; padding: 8px;">月間出席率</th>
                </tr>
            </thead>
            <tbody>
                ${history.monthlyData.map(row => `
                    <tr>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${row.year}年${row.month}月</td>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${(row.attendance_days || 0) + (row.absence_days || 0)}</td>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${row.attendance_days}</td>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${row.absence_days}</td>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${row.late_slots || 0}</td>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${(history.cumulativeData.find(c => c.year === row.year && c.month === row.month)?.attendance_rate * 100).toFixed(1)}%</td>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${(row.attendance_rate * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, {
            scale: 2, // Better resolution
            useCORS: true
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
    container.style.fontFamily = '"Noto Sans JP", sans-serif';

    let contentHtml = '';

    if (isJlpt) {
        // JLPT Template (Simplified for jspdf/html2canvas strategy)
        contentHtml = `
            <div style="text-align: center; margin-bottom: 5mm;">
                <h1 style="font-size: 22pt; font-weight: bold; margin: 0;">JLPT模擬試験 結果通知</h1>
                <div style="font-size: 14pt; margin-top: 2mm;">${yearTerm}</div>
            </div>
            <div style="border: 2px solid #333; padding: 10px; border-radius: 8px; margin-bottom: 5mm;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <div style="font-size: 10pt; color: #666;">学籍番号: ${student.student_id_text}</div>
                        <div style="font-size: 16pt; font-weight: bold;">氏名: ${student.student_name}</div>
                        <div style="font-size: 10pt; color: #666;">クラス: ${student.class_name}</div>
                    </div>
                    <div style="text-align: center; min-width: 40mm;">
                        <div style="font-size: 10pt; background: #eee; padding: 2px;">判定</div>
                        <div style="font-size: 18pt; font-weight: bold; border: 1px solid #333; padding: 5px;">
                            ${student.final_exam_data?.result === '合' || student.final_exam_data?.result === '○' ? '合格' : '不合格'}
                        </div>
                    </div>
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 5mm;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="border: 1px solid #333; padding: 8px;">得点区分</th>
                        <th style="border: 1px solid #333; padding: 8px;">得点</th>
                        <th style="border: 1px solid #333; padding: 8px;">評価</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #333; padding: 8px;">言語知識</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${(student.final_exam_data?.vocab || 0) + (student.final_exam_data?.grammar || 0)} / 60</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: center;">-</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #333; padding: 8px;">読解</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${student.final_exam_data?.reading || 0} / 60</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${student.final_exam_data?.readingEval || '-'}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #333; padding: 8px;">聴解</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${student.final_exam_data?.listening || 0} / 60</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${student.final_exam_data?.listeningEval || '-'}</td>
                    </tr>
                    <tr style="font-weight: bold; background: #fafafa;">
                        <td style="border: 1px solid #333; padding: 8px;">合計</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${student.final_exam_total} / 180</td>
                        <td style="border: 1px solid #333; padding: 8px; text-align: center;">-</td>
                    </tr>
                </tbody>
            </table>
        `;
    } else {
        // Standard Grade Report / Exam Template
        const isExam = type === 'final_exam';
        contentHtml = `
            <div style="text-align: center; margin-bottom: 5mm;">
                <h1 style="font-size: 20pt; font-weight: bold; margin: 0;">${isExam ? '期末試験結果通知' : '成績通知表'}</h1>
                <div style="font-size: 12pt; margin-top: 2mm;">${yearTerm || ''}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5mm; border-bottom: 1px solid #ccc; padding-bottom: 3mm;">
                <div>
                    <div>学籍番号: ${student.student_id_text}</div>
                    <div style="font-size: 14pt; font-weight: bold;">氏名: ${student.student_name} 様</div>
                    <div>クラス: ${student.class_name}</div>
                </div>
                <div style="text-align: right;">
                    <div>神戸外語教育学院</div>
                    <div>発行日: ${new Date().toLocaleDateString('ja-JP')}</div>
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f0f0f0;">
                        <th style="border: 1px solid #999; padding: 8px;">科目</th>
                        <th style="border: 1px solid #999; padding: 8px;">点数</th>
                        <th style="border: 1px solid #999; padding: 8px;">評価</th>
                    </tr>
                </thead>
                <tbody>
                    ${isExam ? `
                        <tr><td style="border: 1px solid #999; padding: 8px;">文字・語彙</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">${student.final_exam_data?.vocab || 0}</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">-</td></tr>
                        <tr><td style="border: 1px solid #999; padding: 8px;">聴解</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">${student.final_exam_data?.listening || 0}</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">-</td></tr>
                        <tr><td style="border: 1px solid #999; padding: 8px;">読解</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">${student.final_exam_data?.reading || 0}</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">-</td></tr>
                        <tr><td style="border: 1px solid #999; padding: 8px;">文法</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">${student.final_exam_data?.grammar || 0}</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">-</td></tr>
                        <tr><td style="border: 1px solid #999; padding: 8px;">作文</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">${student.final_exam_data?.writing || 0}</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">-</td></tr>
                        <tr><td style="border: 1px solid #999; padding: 8px;">会話</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">${student.final_exam_data?.conversation || 0}</td><td style="border: 1px solid #999; padding: 8px; text-align: center;">-</td></tr>
                        <tr style="font-weight: bold; background: #fafafa;">
                            <td style="border: 1px solid #999; padding: 8px;">合計</td>
                            <td style="border: 1px solid #999; padding: 8px; text-align: center;">${student.final_exam_total} / 600</td>
                            <td style="border: 1px solid #999; padding: 8px; text-align: center;">-</td>
                        </tr>
                    ` : `
                        ${Object.keys(student.report_card_data || {}).filter(k => !['attendance', 'participation', 'answerDetails', 'subjectCorrectCounts'].includes(k)).map(key => `
                            <tr>
                                <td style="border: 1px solid #999; padding: 8px;">${key === 'vocab' ? '文字・語彙' : key === 'listening' ? '聴解' : key === 'reading' ? '読解' : key === 'grammar' ? '文法' : key === 'writing' ? '作文' : key === 'conversation' ? '会話' : key}</td>
                                <td style="border: 1px solid #999; padding: 8px; text-align: center;">${student.report_card_data[key].total?.toFixed(1)}</td>
                                <td style="border: 1px solid #999; padding: 8px; text-align: center;">-</td>
                            </tr>
                        `).join('')}
                        <tr style="font-weight: bold; background: #fafafa;">
                            <td style="border: 1px solid #999; padding: 8px;">総合評価</td>
                            <td style="border: 1px solid #999; padding: 8px; text-align: center;">${(student.report_card_total || 0).toFixed(1)}</td>
                            <td style="border: 1px solid #999; padding: 8px; text-align: center;">-</td>
                        </tr>
                    `}
                </tbody>
            </table>
        `;
    }

    container.innerHTML = contentHtml;
    document.body.appendChild(container);

    try {
        const jsPDF = (await import('jspdf')).default;
        const html2canvas = (await import('html2canvas')).default;

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
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.padding = '18mm 22mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = '"Noto Serif JP", "serif"';
    container.style.lineHeight = '1.4';
    container.style.color = '#000';

    const grades = data.grades || {};
    const subjects = ['文字語彙', '文法', '読解', '聴解', '作文', '会話', '総合'];
    const gradeLetters = ['A', 'B', 'C', 'D', 'F'];

    const gradeRows = subjects.map(subject => {
        const selectedGrade = grades[subject] || '';
        const gradeCells = gradeLetters.map(letter => {
            const isSelected = selectedGrade === letter;
            return `<td style="border: 1px solid #000; padding: 4px; text-align: center; width: 14%;">${isSelected ? `<span style="border: 1px solid #000; border-radius: 50%; width: 22px; height: 22px; display: inline-block; line-height: 20px;">${letter}</span>` : letter}</td>`;
        }).join('');
        return `<tr><td style="border: 1px solid #000; padding: 4px; text-align: center; width: 16%; font-weight: bold;">${subject}</td>${gradeCells}</tr>`;
    }).join('');

    container.innerHTML = `
        <h1 style="text-align: center; font-size: 20pt; font-weight: bold; letter-spacing: 0.35em; margin-bottom: 20px;">成績証明書</h1>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 15px; font-size: 9pt;">
            <tr>
                <td style="border: 1px solid #000; padding: 6px; width: 15%; text-align: center; background: #f9f9f9;">学籍番号：</td>
                <td style="border: 1px solid #000; padding: 6px; width: 35%;">${data.studentId || ''}</td>
                <td style="border: 1px solid #000; padding: 6px; width: 15%; text-align: center; background: #f9f9f9;">クラス：</td>
                <td style="border: 1px solid #000; padding: 6px; width: 35%;">${data.className || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f9f9f9;">国　籍：</td>
                <td style="border: 1px solid #000; padding: 6px;">${data.nationality || ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f9f9f9;">氏　名：</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 11pt;">${data.name || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f9f9f9;">生年月日：</td>
                <td style="border: 1px solid #000; padding: 6px;">${data.birthDate || ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f9f9f9;">性　別：</td>
                <td style="border: 1px solid #000; padding: 6px;">${data.gender || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f9f9f9;">入学年月日：</td>
                <td style="border: 1px solid #000; padding: 6px;" colspan="3">${data.enrollmentDate || ''}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; background: #f9f9f9;">卒業年月日：</td>
                <td style="border: 1px solid #000; padding: 6px;" colspan="3">
                    ${data.graduationDate || ''} （ ${data.graduationStatus === 'graduated' ? '<span style="border:1px solid #000; border-radius:12px; padding: 0 4px;">卒業</span>' : '卒業'} ・ ${data.graduationStatus === 'expected' ? '<span style="border:1px solid #000; border-radius:12px; padding: 0 4px;">卒業見込み</span>' : '卒業見込み'} ）
                </td>
            </tr>
        </table>
        <p style="margin: 15px 0; font-size: 9pt;">上記の者の成績は下記の通りであることを証明致します。</p>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
            <thead>
                <tr style="background: #f0f0f0;">
                    <th style="border: 1px solid #000; padding: 6px;">科目</th>
                    <th style="border: 1px solid #000; padding: 6px;" colspan="5">評価</th>
                </tr>
            </thead>
            <tbody>
                ${gradeRows}
                <tr>
                    <td style="border: 1px solid #000; padding: 6px; text-align: left;" colspan="6">特記事項</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 20px; text-align: left; vertical-align: top; height: 60px;" colspan="6">${data.specialNotes || ''}</td>
                </tr>
            </tbody>
        </table>
        <div style="font-size: 8pt; margin-top: 15px;">
            <div style="font-weight: bold;">＊評価基準　ＡＢＣＤＦの5段階</div>
            <div>A　80点以上 / B　79点～70点 / C　69点～60点 / D　59点～50点</div>
        </div>
        <div style="text-align: right; margin-top: 30px; font-size: 10pt;">
            <div style="font-weight: bold; font-size: 12pt;">神戸外語教育学院</div>
            <div style="margin-top: 5px;">${issueDate || new Date().toLocaleDateString('ja-JP')}</div>
        </div>
    `;

    document.body.appendChild(container);

    try {
        const jsPDF = (await import('jspdf')).default;
        const html2canvas = (await import('html2canvas')).default;

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
