const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const schoolNames = ['神戸国際大学', '神戸医療未来大学'];
    console.log('Target schools:', schoolNames);

    // 1. Enrollment
    const { data: enrollmentData, error: enrollError } = await serviceClient
        .from('students')
        .select('student_id_text, destination')
        .in('destination', schoolNames);

    console.log('Enrollments fetched:', enrollmentData ? enrollmentData.length : 0);
    if (enrollmentData) {
        console.log('Enrollments sample:', enrollmentData.slice(0, 5));
    }

    // 2. Pass
    const { data: passData, error: passError } = await serviceClient
        .from('student_exam_schedules')
        .select('student_id, school_name')
        .in('school_name', schoolNames)
        .eq('status', '合格');

    console.log('Passes fetched:', passData ? passData.length : 0);
    if (passData) {
        console.log('Passes sample:', passData.slice(0, 5));
    }

    // Combine student IDs
    const safeEnrollData = enrollmentData || [];
    const safePassData = passData || [];
    const studentIds = Array.from(new Set([
        ...safeEnrollData.map(d => d.student_id_text),
        ...safePassData.map(p => p.student_id)
    ]));

    console.log('Combined student IDs count:', studentIds.length);
    console.log('Combined student IDs:', studentIds);

    // 3. JLPT Records
    if (studentIds.length > 0) {
        const { data: jlptData, error: jlptError } = await serviceClient
            .from('grade_records')
            .select('student_id_text, year_term, final_exam_data')
            .in('student_id_text', studentIds)
            .like('year_term', 'JLPT %');

        console.log('JLPT records fetched:', jlptData ? jlptData.length : 0);
        if (jlptError) {
            console.error('JLPT error:', jlptError);
        }
        if (jlptData) {
            console.log('JLPT sample:', jlptData.slice(0, 5));
            // Check final_exam_data parsing
            jlptData.slice(0, 5).forEach(r => {
                console.log(`id: ${r.student_id_text}, type: ${typeof r.final_exam_data}, val:`, r.final_exam_data);
            });
        }
    }
}

main();
