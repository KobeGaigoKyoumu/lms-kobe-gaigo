const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const dataToSave = {
    student_id: '2504002',
    class_name: '2-1',
    student_name: 'WANG KAI',
    school_type: '大学',
    school_name: '神戸大学',
    exam_date: '2026-06-03',
    department_name: 'Test Faculty',
    exam_type: '一般入試',
    essay_exists: 'なし',
    essay_time: '',
    essay_theme: '',
    japanese_exists: 'なし',
    japanese_time: '',
    japanese_level: 'N2',
    japanese_content: '[]',
    interview_exists: 'なし',
    interview_time: '',
    interview_teachers: '',
    interview_students: '',
    interview_question_1: '',
    interview_question_2: '',
    interview_question_3: '',
    interview_question_4: '',
    interview_question_5: '',
    other_exam_exists: 'なし',
    other_exam_content: '',
    other_exam_time: '',
    advice: '',
    updated_at: new Date().toISOString()
};

async function runTest() {
    console.log('Inserting mock survey into student_exam_surveys...');
    const result = await supabase
        .from('student_exam_surveys')
        .insert({
            ...dataToSave,
            created_at: new Date().toISOString()
        });

    if (result.error) {
        console.error('Error:', result.error);
    } else {
        console.log('Success! Status:', result.status, 'StatusText:', result.statusText);
    }
}

runTest();
