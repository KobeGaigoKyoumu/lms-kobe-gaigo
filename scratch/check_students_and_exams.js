const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('Fetching single student...');
    const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('id, student_id_text, full_name, destination')
        .limit(1)
        .single();
    
    if (studentErr) {
        console.error('Student err:', studentErr.message);
    } else {
        console.log('Student:', student);
    }

    console.log('\nFetching single exam schedule...');
    const { data: exam, error: examErr } = await supabase
        .from('student_exam_schedules')
        .select('id, student_id, school_name, status')
        .limit(1)
        .single();

    if (examErr) {
        console.error('Exam err:', examErr.message);
    } else {
        console.log('Exam schedule:', exam);
        
        // Let's find the student corresponding to this student_id
        if (exam.student_id) {
            const { data: stByUuid, error: stByUuidErr } = await supabase
                .from('students')
                .select('id, student_id_text, full_name')
                .eq('id', exam.student_id)
                .maybeSingle();

            if (stByUuidErr) {
                console.error('Fetch student by UUID error:', stByUuidErr.message);
            } else {
                console.log('Student found by UUID (student_id in exam):', stByUuid);
            }

            const { data: stByIdText, error: stByIdTextErr } = await supabase
                .from('students')
                .select('id, student_id_text, full_name')
                .eq('student_id_text', exam.student_id)
                .maybeSingle();

            if (stByIdTextErr) {
                console.error('Fetch student by ID Text error:', stByIdTextErr.message);
            } else {
                console.log('Student found by ID Text (student_id in exam):', stByIdText);
            }
        }
    }
}

main();
