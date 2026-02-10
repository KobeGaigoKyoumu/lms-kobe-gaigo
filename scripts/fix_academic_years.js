const { createClient } = require('@supabase/supabase-js');
// require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAcademicYears() {
    console.log('Fetching all students...');
    // Limit to 1000 just in case
    const page = 0;
    const pageSize = 1000;

    const { data: students, error } = await supabase
        .from('students')
        .select('student_id_text, academic_year')
        .range(0, 999);

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    console.log(`Found ${students.length} students. Checking academic years...`);

    const updates = [];
    let correctCount = 0;

    for (const student of students) {
        if (!student.student_id_text || student.student_id_text.length < 2) continue;

        const yearShort = parseInt(student.student_id_text.substring(0, 2), 10);
        if (isNaN(yearShort)) continue;

        const correctYear = 2000 + yearShort;

        if (student.academic_year !== correctYear) {
            console.log(`Mismatch: ${student.student_id_text} has ${student.academic_year}, should be ${correctYear}`);
            updates.push({
                student_id_text: student.student_id_text,
                academic_year: correctYear
            });
        } else {
            correctCount++;
        }
    }

    console.log(`${correctCount} students have correct academic_year.`);
    console.log(`${updates.length} students need updates.`);

    if (updates.length > 0) {
        console.log('Applying updates...');
        for (const update of updates) {
            const { error: updateError } = await supabase
                .from('students')
                .update({ academic_year: update.academic_year })
                .eq('student_id_text', update.student_id_text);

            if (updateError) {
                console.error(`Failed to update ${update.student_id_text}:`, updateError.message);
            }
        }
        console.log('All updates completed.');
    }
}

fixAcademicYears();
