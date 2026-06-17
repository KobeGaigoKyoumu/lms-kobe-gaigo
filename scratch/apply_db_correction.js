const path = require('path');
// 複数の環境変数ファイルの可能性を考慮して読み込む
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.preview.local') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: Supabase environment variables are missing.');
    process.exit(1);
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAndCorrectAcademicYears() {
    console.log('Fetching students from database...');
    const { data: students, error: fetchError } = await adminSupabase
        .from('students')
        .select('student_id_text, full_name, class_name, academic_year, status');

    if (fetchError) {
        console.error('Error fetching students:', fetchError);
        return;
    }

    console.log(`Successfully fetched ${students.length} students.`);

    const targets = [];
    students.forEach(s => {
        const studentId = s.student_id_text;
        if (!studentId || studentId.length < 4) return;

        const yearShort = parseInt(studentId.substring(0, 2), 10);
        const month = parseInt(studentId.substring(2, 4), 10);

        // 1〜3月入学の学生を判定
        if (month >= 1 && month <= 3) {
            const calendarYear = 2000 + yearShort;
            const correctAcademicYear = calendarYear - 1;

            // もし academic_year が暦年（calendarYear）のままであれば、修正対象とする
            if (s.academic_year === calendarYear) {
                targets.push({
                    student: s,
                    correctAcademicYear
                });
            }
        }
    });

    console.log(`Found ${targets.length} students to correct.`);

    if (targets.length === 0) {
        console.log('No students need corrections.');
        return;
    }

    console.log('Starting DB update...');
    let successCount = 0;
    let failCount = 0;

    for (const item of targets) {
        const { student, correctAcademicYear } = item;
        console.log(`Updating ${student.student_id_text} (${student.full_name}): academic_year ${student.academic_year} -> ${correctAcademicYear}`);

        const { error: updateError } = await adminSupabase
            .from('students')
            .update({ academic_year: correctAcademicYear })
            .eq('student_id_text', student.student_id_text);

        if (updateError) {
            console.error(`Failed to update ${student.student_id_text}:`, updateError);
            failCount++;
        } else {
            successCount++;
        }
    }

    console.log(`--- DB Correction Completed ---`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

checkAndCorrectAcademicYears();
