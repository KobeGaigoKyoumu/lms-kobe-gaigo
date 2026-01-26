
import { generateGradeReportPDF } from '@/lib/export/puppeteerPdfGenerator';

export async function POST(request) {
    try {
        const { student, yearTerm } = await request.json();

        if (!student) {
            return new Response(JSON.stringify({ error: 'Student data is required' }), { status: 400 });
        }

        const buffer = await generateGradeReportPDF(student, yearTerm);

        const fileName = `成績通知表_${student.student_id_text}_${yearTerm.replace(/\s+/g, '_')}.pdf`;

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
