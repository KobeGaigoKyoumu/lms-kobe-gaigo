require('dotenv').config({ path: '.env.preview.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: Supabase environment variables are missing in .env.preview.local');
    process.exit(1);
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixAcademicYears() {
    console.log('Fetching active students from database...');
    const { data: students, error: fetchError } = await adminSupabase
        .from('students')
        .select('student_id_text, full_name, class_name, academic_year, status')
        .eq('status', 'active');

    if (fetchError) {
        console.error('Error fetching students:', fetchError);
        return;
    }

    console.log(`Successfully fetched ${students.length} active students.`);

    const targets = [];
    students.forEach(s => {
        const ay = s.academic_year;
        // academic_year が 2000未満（1や2、あるいはnull）のものを検出
        if (ay === null || ay < 2000) {
            targets.push(s);
        }
    });

    console.log(`Found ${targets.length} students with invalid academic_year.`);

    if (targets.length === 0) {
        console.log('No data to repair.');
        return;
    }

    console.log('Starting data repair...');

    let successCount = 0;
    let failCount = 0;

    for (const student of targets) {
        const prefix = student.student_id_text.substring(0, 2);
        const parsedPrefix = parseInt(prefix, 10);
        
        if (isNaN(parsedPrefix)) {
            console.warn(`Skipping student ${student.student_id_text} (${student.full_name}) because ID prefix is not a number.`);
            failCount++;
            continue;
        }

        const correctAY = 2000 + parsedPrefix;
        
        console.log(`Updating ID: ${student.student_id_text} | Name: ${student.full_name} | Old AY: ${student.academic_year} -> New AY: ${correctAY}`);

        const { error: updateError } = await adminSupabase
            .from('students')
            .update({ academic_year: correctAY })
            .eq('student_id_text', student.student_id_text);

        if (updateError) {
            console.error(`Failed to update ${student.student_id_text}:`, updateError);
            failCount++;
        } else {
            successCount++;
        }
    }

    console.log('--- Repair Completed ---');
    console.log(`Total processed: ${targets.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

fixAcademicYears();
