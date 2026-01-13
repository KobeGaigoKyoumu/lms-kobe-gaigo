
import { createClient } from '@/lib/supabase/server';
import { generateFromTemplate } from '@/lib/export/wordTemplateProcessor';
import { generateTranscriptPDF } from '@/lib/export/puppeteerPdfGenerator';
import AdmZip from 'adm-zip';

export async function POST(request) {
    const supabase = await createClient();

    try {
        const { studentIds, format, issueDate } = await request.json();
        const dateStr = issueDate || new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return new Response(JSON.stringify({ error: 'No student IDs provided' }), { status: 400 });
        }

        // Fetch Data: Join students and grade_records
        // Note: We might have multiple grade_records for a student (different terms).
        // For Certificate, we usually need the latest "Summary" or "Final" record.
        // Or maybe just the student info + all grades? 
        // The current GradeUploader logic saves report_card_data which seems to be the comprehensive one.
        // We will fetch the latest grade_record for each student.

        const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('*')
            .in('student_id_text', studentIds);

        if (studentsError) throw studentsError;

        const { data: gradesData, error: gradesError } = await supabase
            .from('grade_records')
            .select('*')
            .in('student_id_text', studentIds)
            .order('updated_at', { ascending: false }); // Get latest

        if (gradesError) throw gradesError;

        // Process each student
        const files = [];

        for (const id of studentIds) {
            const student = studentsData.find(s => s.student_id_text === id);
            const gradeRecord = gradesData.find(g => g.student_id_text === id); // First one is latest due to order

            if (!student && !gradeRecord) {
                console.warn(`Data not found for student ID: ${id}`);
                continue;
            }

            // Merge Data
            // Priorities: GradeRecord might have latest Class/Name, but Student has Nationality/DOB
            const mergedInit = {
                studentId: id,
                name: student?.name_romaji || student?.full_name || gradeRecord?.student_name || '',
                className: student?.class_name || gradeRecord?.class_name || '',
                nationality: student?.nationality || '',
                birthDate: formatDate(student?.birth_date),
                gender: student?.gender || '',
                enrollmentDate: formatDate(student?.enrollment_date),
                graduationDate: formatDate(student?.graduation_date),
                graduationStatus: student?.status === 'graduated' ? 'graduated' : 'expected', // logic?
                specialNotes: '', // Placeholder
            };

            // Grades Logic
            // grade_records has report_card_data (JSON) and final_exam_data (JSON)
            // The certificate needs specific subjects A-F.
            // report_card_data structure from GradeUploader: { vocab: {base, total}, ... overall: {total} }
            // We need to convert scores to Grades (A, B, C...)

            const gradeData = gradeRecord?.report_card_data || {};
            const grades = {};
            const keyMap = {
                'vocab': '文字語彙',
                'listening': '聴解',
                'reading': '読解',
                'grammar': '文法',
                'writing': '作文',
                'conversation': '会話'
                // 'overall' -> '総合'?
            };

            // Map subjects
            Object.keys(keyMap).forEach(k => {
                if (gradeData[k] && gradeData[k].total !== undefined) {
                    grades[keyMap[k]] = calculateGrade(gradeData[k].total);
                }
            });

            // Overall
            if (gradeData.overall && gradeData.overall.total !== undefined) {
                grades['総合'] = calculateGrade(gradeData.overall.total);
            }

            const data = {
                ...mergedInit,
                grades
            };

            // Generate File
            let buffer;
            let ext;
            if (format === 'pdf') {
                buffer = await generateTranscriptPDF(data, dateStr);
                ext = 'pdf';
            } else {
                buffer = await generateFromTemplate(data, dateStr);
                ext = 'docx';
            }

            files.push({ name: `${id}_${data.name.replace(/\s+/g, '_')}_成績証明書.${ext}`, buffer });
        }

        if (files.length === 0) {
            return new Response(JSON.stringify({ error: 'No files generated' }), { status: 404 });
        }

        // Return Single File or ZIP
        if (files.length === 1) {
            const file = files[0];
            return new Response(file.buffer, {
                headers: {
                    'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`
                }
            });
        } else {
            const zip = new AdmZip();
            files.forEach(f => {
                zip.addFile(f.name, f.buffer);
            });
            const zipBuffer = zip.toBuffer();
            return new Response(zipBuffer, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename=certificates_${Date.now()}.zip`
                }
            });
        }

    } catch (error) {
        console.error('Certificate Generation Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

// Helpers
function calculateGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()} / ${('0' + (d.getMonth() + 1)).slice(-2)} / ${('0' + d.getDate()).slice(-2)}`;
}
