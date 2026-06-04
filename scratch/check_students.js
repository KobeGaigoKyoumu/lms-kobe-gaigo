require('dotenv').config({ path: '.env.preview.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkStudents() {
    console.log('Fetching active students from DB...');
    const { data, error } = await adminSupabase
        .from('students')
        .select('student_id_text, full_name, class_name, academic_year, status')
        .eq('status', 'active');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} active students.`);
    
    // 学籍番号の頭2桁とacademic_yearの対応を集計
    const mapping = {};
    const wrongSample = [];

    data.forEach(s => {
        const prefix = s.student_id_text.substring(0, 2);
        const key = `${prefix}xx -> AY: ${s.academic_year}`;
        mapping[key] = (mapping[key] || 0) + 1;

        // 本来、26xx なら AY は 2026 であるべき、25xx なら AY は 2025 であるべき
        const expectedAY = 2000 + parseInt(prefix, 10);
        if (s.academic_year !== expectedAY && !isNaN(expectedAY)) {
            wrongSample.push(s);
        }
    });

    console.log('Prefix and Academic Year mapping:', mapping);
    console.log(`Found ${wrongSample.length} students with unexpected academic_year.`);
    
    console.log('Sample of wrong data:');
    wrongSample.slice(0, 50).forEach(s => {
        console.log(`ID: ${s.student_id_text}, Name: ${s.full_name}, Class: ${s.class_name}, AY: ${s.academic_year}`);
    });
}

checkStudents();
