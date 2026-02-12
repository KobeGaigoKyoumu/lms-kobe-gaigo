import { generateGradeReportPDF, generateFinalExamPDF, getBrowser } from '@/lib/export/puppeteerPdfGenerator';
import AdmZip from 'adm-zip';

export async function POST(request) {
    try {
        const { student, students, yearTerm, type } = await request.json();

        // --- BATCH MODE ---
        if (students && Array.isArray(students) && students.length > 0) {
            const zip = new AdmZip();
            // Launch browser once for the batch
            const browser = await getBrowser();

            try {
                for (const s of students) {
                    let buffer;
                    let fileName;

                    if (type === 'final_exam') {
                        buffer = await generateFinalExamPDF(s, s.yearTerm || yearTerm, null, browser);
                        if ((s.yearTerm || yearTerm)?.startsWith('JLPT')) {
                            const level = s.final_exam_data?.level || '';
                            fileName = `JLPT模試${level}結果_${s.student_id_text}_${s.student_name.replace(/\s+/g, '_')}.pdf`;
                        } else {
                            fileName = `期末試験結果_${s.student_id_text}_${s.student_name.replace(/\s+/g, '_')}.pdf`;
                        }
                    } else {
                        buffer = await generateGradeReportPDF(s, s.yearTerm || yearTerm, null, browser);
                        fileName = `成績通知表_${s.student_id_text}_${s.student_name.replace(/\s+/g, '_')}.pdf`;
                    }

                    zip.addFile(fileName, buffer);
                }
            } finally {
                // Ensure browser is closed
                await browser.close();
            }

            const zipBuffer = zip.toBuffer();
            return new Response(zipBuffer, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename=grades_batch_${Date.now()}.zip`
                }
            });
        }

        // --- SINGLE MODE ---
        // Browser is managed inside individual functions (launch -> close)
        if (!student) {
            return new Response(JSON.stringify({ error: 'Student data is required' }), { status: 400 });
        }

        let buffer;
        let fileName;

        if (type === 'final_exam') {
            buffer = await generateFinalExamPDF(student, yearTerm);
            // Make filename safe
            if (yearTerm.startsWith('JLPT')) {
                const level = student.final_exam_data?.level || '';
                fileName = `JLPT模試${level}結果_${student.student_id_text}_${yearTerm.replace(/\s+/g, '_')}.pdf`;
            } else {
                fileName = `期末試験結果_${student.student_id_text}_${yearTerm.replace(/\s+/g, '_')}.pdf`;
            }
        } else {
            // Default to Report Card
            buffer = await generateGradeReportPDF(student, yearTerm);
            fileName = `成績通知表_${student.student_id_text}_${yearTerm.replace(/\s+/g, '_')}.pdf`;
        }

        return new Response(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
            }
        });
    } catch (error) {
        console.error('Individual Grade Report Generation Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
