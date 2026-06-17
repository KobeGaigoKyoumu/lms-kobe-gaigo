require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    console.log('Querying student_exam_schedules from DB...');
    // student_exam_schedules 内の全件を取得（あるいは student_id で student の卒業年度を join）
    // 通信量節約のため、まず student_exam_schedules の全件数を取得
    const { data: exams, error: examError } = await supabase
        .from('student_exam_schedules')
        .select('student_id, school_name, status');

    if (examError) {
        console.error('Error fetching exams:', examError.message);
        process.exit(1);
    }

    console.log(`Total exam schedules in DB: ${exams.length}`);

    // students から学籍番号と卒業年度（あるいは入学年度など）を取得
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('student_id_text, graduation_date, enrollment_date');

    if (studentError) {
        console.error('Error fetching students:', studentError.message);
        process.exit(1);
    }

    const studentYearMap = {};
    students.forEach(s => {
        // graduation_date から年度を判定
        let year = 'Unknown';
        if (s.graduation_date) {
            const date = new Date(s.graduation_date);
            year = date.getFullYear();
            // 日本の卒業時期は通常3月なので、1〜3月卒業の場合は前年を卒業年度（年度ベース）とする
            if (date.getMonth() < 3) {
                year = year - 1;
            }
        }
        studentYearMap[s.student_id_text] = year;
    });

    const examCountsByYear = {};
    exams.forEach(e => {
        const year = studentYearMap[e.student_id] || 'Unknown';
        examCountsByYear[year] = (examCountsByYear[year] || 0) + 1;
    });

    console.log('\nExam counts by Graduation Year:');
    console.log(examCountsByYear);
}

run();
