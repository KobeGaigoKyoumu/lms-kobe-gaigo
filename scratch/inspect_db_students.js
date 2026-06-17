require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function inspectStudents() {
    console.log('Fetching samples from students table...');
    const { data: students, error } = await supabase
        .from('students')
        .select('student_id_text, full_name, destination, class_name, status')
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Fetched ${students.length} students:`);
    console.log(students);

    // 2024年の学籍番号 (例: '2404005') が存在するか確認
    const { data: matched, error: mError } = await supabase
        .from('students')
        .select('student_id_text, full_name, destination, class_name, status')
        .eq('student_id_text', '2404005')
        .single();

    if (mError) {
        console.error('Match error:', mError);
    } else {
        console.log('Matched student:', matched);
    }
}

inspectStudents();
